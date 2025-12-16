import * as ftp from 'basic-ftp';
import * as path from 'path';
import { Readable } from 'stream';

interface UploadOptions {
    userId: string;
    fileType: "user-profiles" | "user-docs" | "admin-docs" | "project-docs";
    fileName: string;
}

async function uploadBlobToFtp(buffer: Buffer, options: UploadOptions): Promise<string | null> {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    const remoteFilePath = `/${options.fileType}/${options.userId}/${options.fileName}`;

    try {
        // Convert the buffer to a readable stream
        const stream = Readable.from(buffer);

        // Connect to the FTP server
        await client.access({
            host: process.env.FTP_SERVER,
            port: Number(process.env.FTP_PORT),
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false
        });

        // Ensure the directory exists
        const remoteDir = path.dirname(remoteFilePath);
        await client.ensureDir(remoteDir);

        // Upload the stream content
        await client.uploadFrom(stream, remoteFilePath);

        const fileUrl = `http://${process.env.FTP_SERVER}/${process.env.FTP_NAME}${remoteFilePath}`;

        console.log("File Uploaded Successfully.");
        console.log("File Url: ", fileUrl);

        return fileUrl;
    } catch (error) {
        console.log("Failed to upload file: ", error);
        return null;
    } finally {
        client.close();
    }
}

export default uploadBlobToFtp;
