declare type userTypes = 'admin' | 'staff' | 'area-head' | 'dep-head' | 'region-head' | 'dep-staff' | 'reg-staff';

declare type NewDepartment = {
    DepartmentName: string;
    Max_staff_count: string | number | null;
    Allow_project: boolean;
    Allow_tasks: boolean;
}

declare type NewAdminType = {
    name: string;
    email: string;
    departments: string,
    [key: string]: any;
}

declare type AdminDataFilters = 'today' | 'month' | 'all' | 'days';

declare type ProjectGetFilters = 'all' | 'new' | 'ongoing' | 'deleted' | 'owned' | 'ended';

declare type NotificationTypes = 'role-change' | 'project-queued' | 'password-changed' | 'project-comment' | 'project-deadline' | 'project-approval' | 'project-completion' | 'project-forwarded' | 'dep-name-changed' | 'block-user';

declare type AdminWithinDaysType = {
    from: string;
    to: string;
}

declare type DocType = {
    name: string | null, 
    fileUrl: string | null,
    expireAt: Date | null,
    remindMe: Date | null
}

declare type StaffData = {
    Name: string,
    Email: string,
    Region: string,
    Area: string,
    documents: DocType[] | [],
    Skills: string[]
}

declare type StaffStatus = 'active' | 'blocked' | 'unverified'

declare type TaskTypes = 'created' | 'new' | 'accepted' | 'completed' | 'ongoing' | 'direct' | 'assigned' | 'self'

declare module 'formidable-serverless';

declare type UserActivities = 'task_adding' | 'project_adding';

declare type HeadPermissions = 'approve_project' | 'view_staff_doc'