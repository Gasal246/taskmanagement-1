import Link from "next/link";
import { Fragment } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

type Crumb = { label: string; href?: string };

export default function FacilitySettingsHeader({ title, description, backHref, breadcrumbs }: {
  title: string;
  description: string;
  backHref: string;
  breadcrumbs: Crumb[];
}) {
  return <div className="space-y-4">
    <Breadcrumb>
      <BreadcrumbList className="text-xs text-slate-500 sm:text-sm">
        {breadcrumbs.map((crumb, index) => <Fragment key={`${crumb.label}-${index}`}>
          {index > 0 && <BreadcrumbSeparator />}
          <BreadcrumbItem>
            {crumb.href ? <BreadcrumbLink asChild className="text-slate-400 hover:text-cyan-300"><Link href={crumb.href}>{crumb.label}</Link></BreadcrumbLink> : <BreadcrumbPage className="text-slate-200">{crumb.label}</BreadcrumbPage>}
          </BreadcrumbItem>
        </Fragment>)}
      </BreadcrumbList>
    </Breadcrumb>

    <header className="rounded-2xl border border-slate-800 bg-gradient-to-r from-cyan-950/35 via-slate-950 to-emerald-950/25 p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Button asChild size="icon" variant="outline" className="mt-0.5 shrink-0 border-slate-700 bg-slate-950/70 text-slate-200 hover:border-cyan-700 hover:bg-cyan-950/40 hover:text-cyan-200">
          <Link href={backHref} aria-label="Go back"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/75">Facility Settings</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-100">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>
    </header>
  </div>;
}
