const express = require('express');
const fileUpload = require('express-fileupload');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
supabase.from('registrations').select('*').then(({ data, error }) => {
    console.log('Supabase Test Query:', data, error);
});

app.post('/api/submit', async (req, res) => {
    try {
        const { name, mobile, email, college, department, shareCount } = req.body;
        const screenshot = req.files ? req.files.screenshot : null;

        console.log('Form Data:', { name, mobile, email, college, department, shareCount });
        console.log('Screenshot:', screenshot ? screenshot.name : 'No screenshot');

        if (!name || !mobile || !email || !college || !department || !screenshot || shareCount < 5) {
            console.log('Validation failed');
            return res.status(400).json({ error: 'All fields are required and share count must be 5' });
        }

        const fileName = `${Date.now()}-${screenshot.name}`;
        const { data, error } = await supabase.storage
            .from('screenshots')
            .upload(fileName, screenshot.data, { contentType: screenshot.mimetype });

        if (error) {
            console.log('Storage Upload Error:', error);
            throw error;
        }

        const screenshotUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${fileName}`;
        console.log('Screenshot URL:', screenshotUrl);

        const { error: dbError } = await supabase
            .from('registrations')
            .insert([
                { name, mobile, email, college, department, share_count: parseInt(shareCount), screenshot_url: screenshotUrl }
            ]);

        if (dbError) {
            console.log('Database Insert Error:', dbError);
            throw dbError;
        }

        console.log('Submission successful');
        res.redirect('/form.html?success=true');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;