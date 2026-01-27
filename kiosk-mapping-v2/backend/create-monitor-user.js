require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./config/supabase');

async function createMonitorUser() {
    const email = 'monitor@kiosk.com';
    const password = 'password123';
    const fullName = 'Kiosk Supervisor';

    console.log(`Creating user: ${email}`);

    try {
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            console.log('User already exists. ID:', existingUser.id);
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([
                {
                    email,
                    password_hash: passwordHash,
                    full_name: fullName,
                    role: 'supervisor' // Giving supervisor role for clarity, though backend defaults to staff in route
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return;
        }

        console.log('User created successfully!');
        console.log('Email:', newUser.email);
        console.log('Password:', password);
        console.log('ID:', newUser.id);
        console.log('Role:', newUser.role);

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

createMonitorUser();
