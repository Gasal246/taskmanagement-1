import * as ftp from 'basic-ftp';
import * as path from 'path';

async function deleteFTPfile(fileUrl: string): Promise<boolean> {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        // Parse the file path from the URL
        const url = new URL(fileUrl);
        const filePath = encodeURI(path.posix.normalize(url.pathname)); // Normalize and encode the path

        // Connect to the FTP server
        await client.access({
            host: process.env.FTP_SERVER,
            port: Number(process.env.FTP_PORT),
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false // Set to true if using FTPS
        });

        // Attempt to delete the file directly
        await client.remove(filePath);
        console.log("File deleted successfully.");
        return true;
    } catch (error) {
        console.log("Failed to delete file:", error);
        return false;
    } finally {
        client.close();
    }
}

export default deleteFTPfile;
