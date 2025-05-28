@RestResource(urlMapping='/ViolenceCase/*')
global without sharing class ViolenceCase {

    @HttpPost
    global static void postViolenceCase() {
        RestRequest request = RestContext.request;
        RestResponse response = RestContext.response;
        response.addHeader('Content-Type', 'application/json');
        
        try {
            // Parse the JSON request body
            ViolenceCaseRequest req = (ViolenceCaseRequest) JSON.deserialize(request.requestBody.toString(), ViolenceCaseRequest.class);
            
            // Create a new Case record
            Case newCase = new Case();
            
            // Link to Account if provided
            if (String.isNotBlank(req.Carema)) {
                Carema__c camera = [SELECT Id FROM Carema__c WHERE CaremaID__c = :req.Carema LIMIT 1];
                if (camera!=null) {
                    newCase.Camera__c = camera.Id;
                }
            }

            
            newCase.Subject = 'Violence Case Reported';
            newCase.Description = req.Description;
            newCase.Origin = req.Origin;
            newCase.Status = 'New';
            newCase.Priority = 'High';
            newCase.IssueDateTime__c = DateTime.valueOf(req.IssueDateTime.replace('T', ' '));
            //newCase.Camera__c = req.Carema; // Custom field for Camera
            newCase.Location__c = req.Location; // Custom field for Location
            
            // Link to Account if provided
            if (String.isNotBlank(req.Account)) {
                List<Account> accList = [SELECT Id FROM Account WHERE Name = :req.Account LIMIT 1];
                if (!accList.isEmpty()) {
                    newCase.AccountId = accList[0].Id;
                }
            }
            
            // Insert the Case
            insert newCase;
            
            // Handle the frame (base64 encoded image) and save as Attachment
            if (String.isNotBlank(req.frame)) {
                try {
                    // Decode the base64 string
                    Blob decodedFrame = EncodingUtil.base64Decode(req.frame);
                    
                    // Create an Attachment
                    Attachment att = new Attachment();
                    att.ParentId = newCase.Id;
                    att.Name = 'Violence_Frame_' + Datetime.now().format('yyyyMMdd_HHmmss') + '.jpg';
                    att.Body = decodedFrame;
                    att.ContentType = 'image/jpeg';
                    insert att;
                } catch (Exception e) {
                    // Log error but continue with case creation
                    System.debug('Error decoding frame or saving attachment: ' + e.getMessage());
                }
            }
            
            // Return success response with Case Number
            response.statusCode = 200;
            response.responseBody = Blob.valueOf(JSON.serialize(new ViolenceCaseResponse(newCase.CaseNumber)));
        } catch (Exception e) {
            // Handle errors and return appropriate status code
            String errorMessage = 'Error processing request: ' + e.getMessage();
            System.debug(errorMessage);
            
            response.statusCode = 500;
            response.responseBody = Blob.valueOf(JSON.serialize(new ErrorResponse(errorMessage)));
        }
    }
    
    // Wrapper class for request JSON
    public class ViolenceCaseRequest {
        public String Carema;
        public String IssueDateTime;
        public String Location;
        public String Origin;
        public String Description;
        public String Account;
        public String frame;
    }
    
    // Wrapper class for success response
    public class ViolenceCaseResponse {
        public String status = 'Success';
        public String caseNumber;
        
        public ViolenceCaseResponse(String caseNumber) {
            this.caseNumber = caseNumber;
        }
    }
    
    // Wrapper class for error response
    public class ErrorResponse {
        public String status = 'Failed';
        public String message;
        
        public ErrorResponse(String message) {
            this.message = message;
        }
    }
}
