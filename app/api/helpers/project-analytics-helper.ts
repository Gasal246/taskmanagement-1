// PROJECT COMPLETED AND PENDING DUAL AREA CHART
export const groupByMonth = async (projects: any[]) => {
    const monthlyData: any = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

    months.forEach(month => {
        monthlyData[month] = { completed: 0, pending: 0 };
    });

    projects.forEach((project) => {
        const monthName = months[new Date(project.date).getMonth()];
        if (project.status === 'completed') {
            monthlyData[monthName].completed += 1;
        } else {
            monthlyData[monthName].pending += 1;
        }
    });

    return Object.keys(monthlyData).map(month => ({
        month,
        completed: monthlyData[month].completed,
        pending: monthlyData[month].pending,
    }));
};


