require('dotenv').config();
const supabase = require('./config/supabase');

async function checkAdmin() {
    console.log('Checking for admin user...');

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@kioskmap.com')
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error checking user:', error);
        return;
    }

    if (user) {
        console.log('Admin user exists. ID:', user.id);
        console.log('Stored Hash:', user.password_hash);

        // Update hash if it's the placeholder
        if (user.password_hash === '$2a$10$YourHashedPasswordHere' || user.password_hash.includes('YourHashed')) {
            console.log('Updating placeholder hash to real hash...');
            const { error: updateError } = await supabase
                .from('users')
                .update({ password_hash: '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2' })
                .eq('id', user.id);

            if (updateError) console.error('Error updating hash:', updateError);
            else console.log('Hash updated successfully!');
        }
    } else {
        console.log('Admin user not found. Creating...');
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    email: 'admin@kioskmap.com',
                    password_hash: '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2',
                    full_name: 'System Administrator',
                    role: 'admin'
                }
            ])
            .select()
            .single();

        if (insertError) console.error('Error creating user:', insertError);
        else console.log('Admin user created successfully! ID:', newUser.id);
    }
}

checkAdmin();
