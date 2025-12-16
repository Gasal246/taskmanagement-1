import axios from 'axios';

export async function getSuperUserById(id: string) {
    try {
        const res = await axios.get(`/api/superadmin/get-id/${id}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getPlans () {
    try {
        const res = await axios.get('/api/superadmin/plans/get-all');
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addPlan (payload: any) {
    try {
        const res = await axios.post('/api/superadmin/plans/add-plan', payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function editPlan (payload: any) {
    try {
        const data = JSON.parse(payload?.get('body') as string);
        const res = await axios.post(`/api/superadmin/plans/edit-plan/${data?._id}`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function deletePlan (id: string) {
    try {
        const res = await axios.post(`/api/superadmin/plans/delete-plan/${id}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addApplicationRole (payload: any) {
    try {
        const res = await axios.post('/api/superadmin/roles/add-role', payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getApplicationRoles () {
    try {
        const res = await axios.get('/api/superadmin/roles/get-all');
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function deleteRole (id: string) {
    try {
        const res = await axios.post(`/api/superadmin/roles/delete-role/${id}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}