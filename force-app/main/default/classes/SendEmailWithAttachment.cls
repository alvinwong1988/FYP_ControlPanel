public class SendEmailWithAttachment {
    @InvocableMethod(label='Send Email with Attachment')
    public static void sendEmail(List<FlowInput> inputs) {
        // Fetch Org-Wide Email Address for sender (optional, if you want to set a specific sender)
        OrgWideEmailAddress[] owea = [SELECT Id FROM OrgWideEmailAddress WHERE Address = 'winggoldgoldgold@gmail.com' LIMIT 1];
        
        for (FlowInput input : inputs) {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { input.toAddress });
            mail.setSubject(input.subject);
            mail.setHtmlBody(input.body);
            
            // Set Org-Wide Email Address as sender if available
            if (!owea.isEmpty()) {
                mail.setOrgWideEmailAddressId(owea[0].Id);
            }
            
            // Fetch attachments using the Attachment object
            List<Attachment> attachments = [SELECT Id, Name, Body FROM Attachment WHERE ParentId = :input.recordId];
            List<Messaging.EmailFileAttachment> emailAttachments = new List<Messaging.EmailFileAttachment>();
            
            for (Attachment att : attachments) {
                Messaging.EmailFileAttachment emailAtt = new Messaging.EmailFileAttachment();
                emailAtt.setFileName(att.Name);
                Blob blobContent = fetchAttachmentBody(att.Id); // Custom method to fetch Blob
                emailAtt.setBody(blobContent);
                //emailAtt.setBody(att.Body);
                emailAttachments.add(emailAtt);
            }
            
            // Attach the files to the email if there are any
            if (!emailAttachments.isEmpty()) {
                mail.setFileAttachments(emailAttachments);
            }
            
            // Send the email
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        }
    }
    
    public class FlowInput {
        @InvocableVariable
        public String toAddress;
        @InvocableVariable
        public String subject;
        @InvocableVariable
        public String body;
        @InvocableVariable
        public String recordId;
    }

    private static Blob fetchAttachmentBody(String attachmentId) {
        // Example of making an HTTP callout to fetch the attachment content
        String endpoint = '/services/data/v61.0/sobjects/Attachment/' + attachmentId + '/Body';
        HttpRequest req = new HttpRequest();
        req.setEndpoint( URL.getOrgDomainURL().toExternalForm() + endpoint); // Use Named Credential for authentication
        req.setMethod('GET');
        Http http = new Http();
        HttpResponse res = http.send(req);
        if (res.getStatusCode() == 200) {
            return res.getBodyAsBlob();
        } else {
            throw new AuraHandledException('Failed to fetch attachment body: ' + res.getStatus());
        }
    }
}
