require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createStaff() {
    const email = 'staff@kioskmap.com';
    const password = 'staff123';
    const fullName = 'Staff Member (Read-Only)';
    const role = 'staff';

    console.log(`Checking if user ${email} exists...`);
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        console.log('Staff user already exists. Updating password and role...');
        const passwordHash = await bcrypt.hash(password, 10);
        const { error } = await supabase
            .from('users')
            .update({
                password_hash: passwordHash,
                role: role,
                full_name: fullName
            })
            .eq('id', existingUser.id);

        if (error) {
            console.error('Error updating staff user:', error);
        } else {
            console.log('Staff user updated successfully.');
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        }
        return;
    }

    console.log('Creating new staff user...');
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from('users')
        .insert([{
            email,
            password_hash: passwordHash,
            full_name: fullName,
            role
        }])
        .select();

    if (error) {
        console.error('Error creating staff user:', error);
    } else {
        console.log('Staff user created successfully.');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    }
}

createStaff();
