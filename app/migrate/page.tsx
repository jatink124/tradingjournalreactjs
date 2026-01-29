'use client';

import React, { useState } from 'react';

// --- CONFIGURATION ---
const CLOUD_NAME = 'dsupeybo6'; 
const UPLOAD_PRESET = 'test123'; 

export default function MigratePage() {
    const [status, setStatus] = useState<string>("Ready to migrate");
    const [progress, setProgress] = useState(0);

    const startMigration = async () => {
        setStatus("Fetching entries...");
        try {
            // 1. Fetch all existing entries
            const res = await fetch('/api/journal');
            const entries = await res.json();
            
            if (!Array.isArray(entries)) {
                setStatus("Error: Could not fetch entries");
                return;
            }

            // 2. Filter entries that have Base64 images
            const dirtyEntries = entries.filter((e: any) => {
                const images = typeof e.images === 'string' ? JSON.parse(e.images) : e.images;
                // Check if any image starts with "data:image"
                return Array.isArray(images) && images.some((img: string) => img.startsWith('data:image'));
            });

            setStatus(`Found ${dirtyEntries.length} entries with old images. Starting upload...`);
            let processed = 0;

            // 3. Loop and Process
            for (const entry of dirtyEntries) {
                const images = typeof entry.images === 'string' ? JSON.parse(entry.images) : entry.images;
                const newImages: string[] = [];
                let entryChanged = false;

                for (const img of images) {
                    if (img.startsWith('data:image')) {
                        // It's a base64 image, upload to Cloudinary
                        setStatus(`Uploading image for entry ${entry.id}...`);
                        
                        const formData = new FormData();
                        formData.append('file', img);
                        formData.append('upload_preset', UPLOAD_PRESET);

                        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                            method: 'POST',
                            body: formData
                        });
                        const cloudData = await cloudRes.json();

                        if (cloudData.secure_url) {
                            newImages.push(cloudData.secure_url);
                            entryChanged = true;
                        } else {
                            console.error("Upload failed", cloudData);
                            newImages.push(img); // Keep old if failed
                        }
                    } else {
                        newImages.push(img); // Keep existing URLs
                    }
                }

                if (entryChanged) {
                    // Update the entry in the database
                    await fetch('/api/journal', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...entry, // Keep all other fields
                            images: newImages, // Update images
                            // Ensure parsing mistakes if they are stringified
                            mistakes: typeof entry.mistakes === 'string' ? JSON.parse(entry.mistakes) : entry.mistakes
                        })
                    });
                }

                processed++;
                setProgress(Math.round((processed / dirtyEntries.length) * 100));
            }

            setStatus("Migration Complete! Database is now lightweight.");

        } catch (error) {
            console.error(error);
            setStatus("Critical Error: Check console");
        }
    };

    return (
        <div style={{padding:'50px', background:'#1e1e1e', color:'#fff', minHeight:'100vh', fontFamily:'sans-serif'}}>
            <h1>Database Image Migrator</h1>
            <p>This tool scans your database for heavy Base64 images and moves them to Cloudinary.</p>
            
            <div style={{marginTop:'20px', padding:'20px', border:'1px solid #333', background:'#2d2d2d'}}>
                <h3>Status: <span style={{color:'var(--cyan, #06b6d4)'}}>{status}</span></h3>
                
                {progress > 0 && (
                    <div style={{width:'100%', height:'20px', background:'#444', marginTop:'10px'}}>
                        <div style={{width: `${progress}%`, height:'100%', background:'#10b981', transition:'0.3s'}}></div>
                    </div>
                )}
            </div>

            <button 
                onClick={startMigration}
                style={{
                    marginTop:'20px', padding:'15px 30px', fontSize:'1.2rem', 
                    background:'#06b6d4', border:'none', cursor:'pointer', color:'#000', fontWeight:'bold'
                }}
            >
                Start Migration
            </button>
        </div>
    );
}