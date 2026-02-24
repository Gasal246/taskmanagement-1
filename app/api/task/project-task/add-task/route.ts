import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import FcmTokens from "@/models/fcm_tokens.model";
import Notifications from "@/models/notifications.model";
import { getAdminMessaging } from "@/lib/firebaseAdmin";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body{
    project_id: string | null,
    assigned_to: string | null,
    task_name:string,
    task_description: string,
    start_date: Date,
    end_date: Date,
    status: string,
    business_id: string,
    is_project_task: boolean
}

export async function POST(req:NextRequest){
    try{
        const session: any = await auth();
        if(!session) return new NextResponse("Un Authorized Access", { status: 401 });
        
        const user = await Users.findById(session?.user?.id).select("name");

        const body:Body = await req.json();

        if(!body.assigned_to){
            body.assigned_to = null;
        }

        const newTask = new Business_Tasks({
            project_id: body.project_id,
            is_project_task: body.is_project_task,
            creator: session?.user?.id,
            task_name: body.task_name,
            task_description: body.task_description,
            start_date: body.start_date,
            end_date: body.end_date,
            status: body.status,
            activity_count: 0,
            completed_activity: 0,
            business_id: body.business_id
        });
        {body.is_project_task ? newTask.assigned_teams = body.assigned_to : newTask.assigned_to = body.assigned_to}
        const Task = await newTask.save();
        if(body.is_project_task){
            const taskFLow = new Flow_Log({
                Log: `${body.task_name} Task Added by ${user.name}`,
                project_id: body?.project_id || "",
                task_id: Task._id,
                descrption: "New Task Added",
                user_id: session?.user?.id
            });
            await taskFLow.save();
        }

        if (!body.is_project_task && body.assigned_to) {
            const truncateText = (value: string, maxLength: number) => {
                const text = value?.trim() || "";
                if (text.length <= maxLength) return text;
                return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
            };

            const roleCookie = req.cookies.get("user_role")?.value || "";
            const domainCookie = req.cookies.get("user_domain")?.value || "";
            let roleLabel = "";
            let domainLabel = "";
            try {
                const parsedRole = roleCookie ? JSON.parse(roleCookie) : null;
                roleLabel = parsedRole?.role_name || parsedRole?.role || "";
            } catch (error) {
                roleLabel = "";
            }
            try {
                const parsedDomain = domainCookie ? JSON.parse(domainCookie) : null;
                domainLabel =
                    parsedDomain?.region_name ||
                    parsedDomain?.area_name ||
                    parsedDomain?.location_name ||
                    parsedDomain?.dept_name ||
                    parsedDomain?.name ||
                    "";
            } catch (error) {
                domainLabel = "";
            }

            const formattedRole = roleLabel ? roleLabel.split("_").join(" ") : "";
            const byLineParts = [formattedRole, domainLabel].filter(Boolean);
            const byLine = byLineParts.join(" + ");

            const taskNameShort = truncateText(body.task_name || "Task", 56);
            const taskDescriptionShort = truncateText(body.task_description || "", 120);
            const taskId = Task?._id?.toString();

            const notificationTitle = "New Task Updated";
            const notificationBody = [taskNameShort, taskDescriptionShort]
                .filter(Boolean)
                .join(" — ");

            try {
                await Notifications.create({
                    recipient_id: body.assigned_to,
                    sender_id: session?.user?.id || null,
                    kind: "task",
                    title: notificationTitle,
                    body: notificationBody,
                    data: {
                        type: "task",
                        taskId,
                        link: "",
                    },
                    meta: {
                        taskId,
                        taskName: taskNameShort,
                        taskDescription: taskDescriptionShort,
                        byLine,
                        role: formattedRole || roleLabel,
                        domain: domainLabel,
                    },
                    read_at: null,
                });
            } catch (error) {
                console.log("Failed to store task notification", error);
            }

            try {
                const tokens = await FcmTokens.find(
                    { user_id: body.assigned_to },
                    { token: 1 }
                ).lean();
                const tokenList = tokens.map((item: any) => item.token).filter(Boolean);
                if (tokenList.length > 0) {
                    const messaging = getAdminMessaging();
                    const response = await messaging.sendEachForMulticast({
                        tokens: tokenList,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody || taskNameShort,
                        },
                        data: {
                            type: "task",
                            taskId: taskId || "",
                            link: "",
                            taskName: taskNameShort,
                            taskDescription: taskDescriptionShort,
                            byLine: byLine,
                        },
                    });
                    const invalidTokens = response.responses
                        .map((res, index) => {
                            const code = res.error?.code || res.error?.errorInfo?.code || "";
                            if (
                                code === "messaging/registration-token-not-registered" ||
                                code === "messaging/invalid-registration-token"
                            ) {
                                return tokenList[index];
                            }
                            return null;
                        })
                        .filter(Boolean) as string[];
                    if (invalidTokens.length > 0) {
                        await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
                    }
                }
            } catch (error) {
                console.log("Failed to send task notification", error);
            }
        }

        return NextResponse.json({message:"Task Created", data:Task}, {status: 201});
    }catch(err){
        console.log("error while adding new Task", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
        
    }
}
