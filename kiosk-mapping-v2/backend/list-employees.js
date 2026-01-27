require('dotenv').config();
const supabase = require('./config/supabase');

async function listEmployees() {
    try {
        const { data: employees, error } = await supabase
            .from('employees')
            .select('id, employee_id, full_name, status');

        if (error) {
            console.error('Error fetching employees:', error);
            return;
        }

        console.log('--- Employee List ---');
        if (employees.length === 0) {
            console.log('No employees found in the database.');
        } else {
            employees.forEach(emp => {
                console.log(`Name: ${emp.full_name} | ID (QR Code): ${emp.employee_id} | Status: ${emp.status}`);
            });
        }
        console.log('---------------------');
        console.log('Use one of the "ID (QR Code)" values above to generate a QR code for testing.');

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

listEmployees();
