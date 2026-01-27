const supabase = require('./config/supabase');

async function checkEmployees() {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Employees in DB:', data);
}

checkEmployees();
