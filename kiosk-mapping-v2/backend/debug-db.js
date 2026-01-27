require('dotenv').config();
const supabase = require('./config/supabase');

async function debugEmployees() {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log('Employees in DB:', JSON.stringify(data, null, 2));
}

debugEmployees();
