import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export class FileUtils {
    static readonly UPLOAD_DIR = 'uploads/items';
    static readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    static async saveImage(file: File): Promise<string> {
        try {
            // Validate file
            if (!file) {
                throw new Error('No file provided');
            }

            // Validate file type
            if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
                throw new Error('Invalid file type. Only JPEG, PNG and WebP are allowed');
            }

            // Validate file size
            if (file.size > this.MAX_FILE_SIZE) {
                throw new Error('File too large. Maximum size is 5MB');
            }

            // Create uploads directory if it doesn't exist
            await mkdir(this.UPLOAD_DIR, { recursive: true });

            // Generate unique filename
            const fileExtension = file.type.split('/')[1];
            const fileName = `${randomUUID()}.${fileExtension}`;
            const filePath = join(this.UPLOAD_DIR, fileName);

            // Convert File to ArrayBuffer and then to Buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Save file
            await writeFile(filePath, buffer);

            // Return the relative path
            return filePath;
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }

    static getImageUrl(imagePath: string): string {
        // Convert file path to URL
        return `/${imagePath}`;
    }
}