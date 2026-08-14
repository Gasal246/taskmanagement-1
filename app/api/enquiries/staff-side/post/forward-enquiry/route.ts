import { auth } from "@/auth";
import { notifyEnquiryForward } from "@/app/api/helpers/enquiry-notifications";
import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_users_log from "@/models/eq_users_log.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), "must be a valid ID");

const forwardEnquirySchema = z
  .object({
    enquiry_id: objectIdSchema,
    access_users: z.array(objectIdSchema).max(100).optional().default([]),
    // Kept temporarily for clients that loaded the old page bundle.
    users: z.array(objectIdSchema).max(100).optional().default([]),
    assigned_to: z.union([
      objectIdSchema,
      z.array(objectIdSchema).min(1).max(100),
    ]),
    priority: z.coerce.number().int().min(1).max(10),
    action: z.enum(["Visit", "Call", "Finished"]),
    feedback: z.string().max(5000).optional().default(""),
    next_date: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.union([z.null(), z.coerce.date()])
    ),
  })
  .transform((body) => ({
    enquiryId: body.enquiry_id,
    accessUsers: Array.from(new Set([...body.access_users, ...body.users])),
    assignedTo: Array.from(
      new Set(Array.isArray(body.assigned_to) ? body.assigned_to : [body.assigned_to])
    ),
    priority: body.priority,
    action: body.action,
    feedback: body.feedback.trim(),
    nextDate: body.next_date,
    isFinished: body.action === "Finished",
  }));

class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RequestError";
  }
}

const jsonResponse = (message: string, status: number) =>
  NextResponse.json({ message, status }, { status });

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse("Request body must be valid JSON", 400);
  }

  const parsedBody = forwardEnquirySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    const field = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return jsonResponse(`Invalid request. ${field}${issue?.message || "Check the submitted values."}`, 400);
  }

  try {
    const session: any = await auth();
    if (!session?.user?.id) {
      return jsonResponse("Unauthorized Access", 401);
    }
    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return jsonResponse("Invalid authenticated user", 401);
    }

    await connectDB({ throwOnError: true });
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB connection is unavailable");
    }

    const {
      enquiryId,
      accessUsers,
      assignedTo,
      priority,
      action,
      feedback,
      nextDate,
      isFinished,
    } = parsedBody.data;
    const actorId = String(session.user.id);
    const recipientIds = Array.from(
      new Set([...accessUsers, ...assignedTo, actorId])
    );

    let actorName = "User";

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        // MongoDB does not support parallel operations on one transaction session.
        const actor = await Users.findById(actorId).select("name").session(dbSession);
        const enquiry = await Eq_enquiry.findById(enquiryId).session(dbSession);
        const latestHistoryResult = await Eq_enquiry_histories
          .findOne({ enquiry_id: enquiryId })
          .sort({ step_number: -1, createdAt: -1 })
          .session(dbSession)
          .lean();
        const validRecipients = await Users.find({ _id: { $in: recipientIds } })
          .select("_id")
          .session(dbSession)
          .lean();

        if (!actor) {
          throw new RequestError(401, "Authenticated user no longer exists");
        }
        if (!enquiry) {
          throw new RequestError(404, "Enquiry not found");
        }
        const latestHistory: any = latestHistoryResult;

        const latestAssignees = Array.isArray(latestHistory?.assigned_to)
          ? latestHistory.assigned_to.map(String)
          : [];
        const isCreator = String(enquiry.createdBy || "") === actorId;
        if (!isCreator && !latestAssignees.includes(actorId)) {
          throw new RequestError(403, "You are not allowed to forward this enquiry");
        }

        if (validRecipients.length !== recipientIds.length) {
          throw new RequestError(
            400,
            "One or more selected users no longer exist. Refresh the page and select again."
          );
        }

        const [stepResult] = await Eq_enquiry_histories.aggregate<{
          maxStep?: number;
        }>([
          {
            $match: {
              enquiry_id: enquiry._id,
              step_number: { $type: "number" },
            },
          },
          { $group: { _id: null, maxStep: { $max: "$step_number" } } },
        ]).session(dbSession);
        const previousStep = Number(stepResult?.maxStep || 0);
        const nextStep = Number.isSafeInteger(previousStep) && previousStep >= 0
          ? previousStep + 1
          : 1;

        const newHistory = new Eq_enquiry_histories({
          camp_id: enquiry.camp_id || null,
          enquiry_id: enquiry._id,
          assigned_to: assignedTo,
          forwarded_by: actor._id,
          step_number: nextStep,
          priority,
          is_finished: isFinished,
          action,
          feedback,
          next_step_date: nextDate,
        });
        const savedHistory = await newHistory.save({ session: dbSession });

        await Eq_enquiry_access.insertMany(
          recipientIds.map((userId) => ({
            history_id: savedHistory._id,
            enquiry_id: enquiry._id,
            camp_id: enquiry.camp_id || null,
            user_id: userId,
          })),
          { session: dbSession }
        );

        const [priorityResult] = await Eq_enquiry_histories.aggregate<{
          average?: number;
        }>([
          {
            $match: {
              enquiry_id: enquiry._id,
              priority: { $type: "number" },
            },
          },
          { $group: { _id: null, average: { $avg: "$priority" } } },
        ]).session(dbSession);
        enquiry.priority = String(Math.round(priorityResult?.average ?? priority));
        if (isFinished) enquiry.status = "Closed";
        await enquiry.save({ session: dbSession });

        if (latestHistory?.action === "Visit" || latestHistory?.action === "Call") {
          const camp: any = enquiry.camp_id
            ? await Eq_camps.findById(enquiry.camp_id)
                .select("camp_name")
                .session(dbSession)
                .lean()
            : null;
          const actionLabel = latestHistory.action === "Visit" ? "Visited" : "Called";
          const campLabel = camp?.camp_name || "the camp";
          await new Eq_users_log({
            user_id: actor._id,
            camp_id: enquiry.camp_id || null,
            enquiry_id: enquiry._id,
            log: `${actor.name || "User"} ${actionLabel} ${campLabel}`,
          }).save({ session: dbSession });
        }

        actorName = String(actor.name || "User");
      });
    } finally {
      await dbSession.endSession();
    }

    // Notifications are secondary: a notification outage must not roll back a
    // successfully committed forward operation or invite duplicate retries.
    try {
      await notifyEnquiryForward({
        req,
        recipientIds,
        enquiryId,
        action,
        priority,
        actorId,
        actorName,
      });
    } catch (error) {
      console.error("Enquiry forwarded, but notifications failed:", error);
    }

    return jsonResponse("Enquiry Forwarded", 201);
  } catch (error) {
    if (error instanceof RequestError) {
      return jsonResponse(error.message, error.status);
    }
    if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
      console.error("Invalid forward enquiry data:", error);
      return jsonResponse("The enquiry contains invalid data and could not be forwarded", 400);
    }

    console.error("Error while forwarding enquiry:", error);
    return jsonResponse("Internal Server Error", 500);
  }
}
