export const ALL_ROLES = [
    'BUSINESS_ADMIN',
    'REGION_HEAD', 
    'REGION_STAFF', 
    'REGION_DEP_HEAD', 
    'REGION_DEP_STAFF', 
    'AREA_HEAD', 
    'AREA_STAFF', 
    'AREA_DEP_HEAD', 
    'AREA_DEP_STAFF', 
    'LOCATION_HEAD', 
    'LOCATION_STAFF', 
    'LOCATION_DEP_HEAD', 
    'LOCATION_DEP_STAFF', 
    'AGENT'
];

export const HEAD_ROLES = [
    "REGION_HEAD", 
    "REGION_DEP_HEAD", 
    "AREA_HEAD", 
    "AREA_DEP_HEAD", 
    "LOCATION_HEAD", 
    "LOCATION_DEP_HEAD"
];

export const SALES_STAFF_ROLE_LABEL_SCOPES = ["REGION", "AREA", "LOCATION"];

export const DEPARTMENT_TYPES = [
    { label: "Sales", value: "sales" },
    { label: "Marketing", value: "marketing" },
    { label: "IT", value: "it" },
    { label: "Finance", value: "finance" },
    { label: "HR", value: "hr" },
    { label: "Operations", value: "operations" },
    { label: "Customer Support", value: "customer-support" },
    { label: "Legal", value: "legal" },
    { label: "R & D", value: "rnd" },
    { label: "Product Management", value: "product-management" },
    { label: "Procurement", value: "procurement" },
    { label: "Other", value: "other" }
];

export const TASK_STATUS = [
    {label: "To Do", value: "To Do"},
    {label: "In Progress", value: "In Progress"},
    {label: "Completed", value: "Completed"},
    {label: "Cancelled", value: "Cancelled"}
]

export const EQ_CAMP_TYPES = ["Labour Camp", "Staff Accommodation", "Hotel Apartment", "Other"];

export const EQ_CAMP_VISITED_STATUS_OPTIONS = ["Visited", "To Visit", "Cancelled"] as const;

export const Eq_CAPACITY_OPTIONS = ["<500", "500-1000", "1000-2000", "2000-3000", "3000-5000", "5000-10000", "10000-20000", "20000-35000", "35000-50000", "50000+"];

export const EQ_CAPACITY_LIMITS: Record<string, number> = {
  "<500": 500,
  "500-1000": 1000,
  "1000-2000": 2000,
  "2000-3000": 3000,
  "3000-5000": 5000,
  "5000-10000": 10000,
  "10000-20000": 20000,
  "20000-35000": 35000,
  "35000-50000": 50000,
  "50000+": 99999
};

export const ENQUIRY_STATUS = [
    {_id:"Pending", name:"Pending"},
    {_id:"In Progress", name: "In Progress"},
    {_id: "Closed", name: "Closed"}
];

export const EQ_CONTACT_AUTHORITY = [
    {_id: "Operational", name: "Operational"},
    {_id: "Manager", name: "Manager"},
    {_id: "Director", name: "Director"},
    {_id: "C-Level", name: "C-Level"}
]

export const NOTIFICATION_RETENTION_DAYS = 30;
export const NOTIFICATION_RETENTION_SECONDS = NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60;
export const NOTIFICATION_RETENTION_MS =
  NOTIFICATION_RETENTION_SECONDS * 1000;
