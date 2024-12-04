export class SMSService {
    private static SMS_API_URL = 'http://18.133.83.229:8021/api/v1/sms';
    
    static async sendSMS(message: string, destination: string | string[]): Promise<any> {
        const destinations = Array.isArray(destination) 
            ? destination.map(d => this.formatPhoneNumber(d))
            : [this.formatPhoneNumber(destination)];

        const response = await fetch(this.SMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service: 'giant-sms',
                message,
                senderID: 'YourBrandName',
                destination: destinations
            })
        });

        const result = await response.json();
        if (result.status === 'error') {
            throw new Error(result.message || 'SMS sending failed');
        }
        return result;
    }

    private static formatPhoneNumber(phone: string): string {
        // Remove any non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // If number starts with 0, replace with country code
        if (cleaned.startsWith('0')) {
            cleaned = '233' + cleaned.slice(1);
        }
        
        // If number doesn't have country code, add it
        if (!cleaned.startsWith('233')) {
            cleaned = '233' + cleaned;
        }
        
        return cleaned;
    }
}
