public without sharing class VideoPreviewController {
    
    @AuraEnabled(cacheable=true)
    public static List<VideoWrapper> getVideosForRecord(Id recordId) {
        List<VideoWrapper> videoList = new List<VideoWrapper>();
        
        try {
            // Query ContentDocumentLink to get files linked to the record
            List<ContentDocumentLink> links = [
                SELECT ContentDocumentId
                FROM ContentDocumentLink
                WHERE LinkedEntityId = :recordId
            ];
            
            if (!links.isEmpty()) {
                Set<Id> contentDocumentIds = new Set<Id>();
                for (ContentDocumentLink link : links) {
                    contentDocumentIds.add(link.ContentDocumentId);
                }
                
                // Query ContentVersion for video files
                List<ContentVersion> versions = [
                    SELECT Id, Title, ContentDocumentId, FileExtension, ContentSize, CreatedDate, ContentUrl
                    FROM ContentVersion
                    WHERE ContentDocumentId IN :contentDocumentIds
                    AND FileExtension IN ('mp4', 'webm', 'ogg') // Add other video formats if needed
                    ORDER BY CreatedDate DESC
                ];
                
                // Construct video metadata and URLs
                for (ContentVersion cv : versions) {
                    VideoWrapper video = new VideoWrapper();
                    video.contentVersionId = cv.Id;
                    video.title = cv.Title;
                    video.fileExtension = cv.FileExtension;
                    video.fileSize = formatFileSize(cv.ContentSize);
                    video.createdDate = cv.CreatedDate;
                    // Use rendition URL directly, avoiding DML for ContentDistribution
                    video.fileUrl = '/sfc/servlet.shepherd/version/renditionDownload?rendition=ORIGINAL_Video&versionId=' + cv.Id;
                    videoList.add(video);
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching videos: ' + e.getMessage());
        }
        
        return videoList;
    }
    
    // Helper method to format file size
    private static String formatFileSize(Long sizeInBytes) {
        if (sizeInBytes < 1024) {
            return sizeInBytes + ' B';
        } else if (sizeInBytes < 1048576) {
            return (sizeInBytes / 1024) + ' KB';
        } else if (sizeInBytes < 1073741824) {
            return (sizeInBytes / 1048576) + ' MB';
        } else {
            return (sizeInBytes / 1073741824) + ' GB';
        }
    }
    
    // Wrapper class to hold video metadata
    public class VideoWrapper {
        @AuraEnabled public String contentVersionId;
        @AuraEnabled public String title;
        @AuraEnabled public String fileExtension;
        @AuraEnabled public String fileSize;
        @AuraEnabled public Datetime createdDate;
        @AuraEnabled public String fileUrl;
    }
}
