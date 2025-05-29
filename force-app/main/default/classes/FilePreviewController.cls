/**
 * @author Gil Avignon
 * @date 12/05/2020
 * @description File Preview Component with filter and sort options for Attachments
 */
public with sharing class FilePreviewController {
    private static Map<String, String> mapConditionByFilter = new Map<String, String>{
        'gt100KB' => 'BodyLength >= ' + 100 * 1024,
        'lt100KBgt10KB' => '(BodyLength < ' + 100 * 1024 + ' AND BodyLength > ' + 10 * 1024 + ')',
        'lt10KB' => 'BodyLength <= ' + 10 * 1024
    };

    @AuraEnabled
    public static FilesInformation initFiles(Id recordId, List<String> filters, Integer defaultLimit, String sortField, String sortOrder) {
        List<Attachment> attachments = new List<Attachment>();
        defaultLimit = defaultLimit == null ? 3 : defaultLimit;

        String query = generateQuery(recordId, filters, defaultLimit, null, sortField, sortOrder);
        String countQuery = 'SELECT count() FROM Attachment WHERE ParentId = ' + '\'' + recordId + '\'';
        countQuery += generateConditionString(filters);
        System.debug(query);
        System.debug(countQuery);
        attachments = Database.query(query);
        FilesInformation fileInfo = new FilesInformation();
        fileInfo.totalCount = Database.countQuery(countQuery);
        fileInfo.attachments = attachments;
        fileInfo.documentForceUrl = 'https://' + URL.getOrgDomainUrl().toExternalForm().substringBefore('.') + '--c.documentforce.com';

        return fileInfo;
    }

    @AuraEnabled
    public static List<Attachment> loadFiles(Id recordId, List<String> filters, Integer defaultLimit, Integer offset, String sortField, String sortOrder) {
        String query = generateQuery(recordId, filters, defaultLimit, offset, sortField, sortOrder);
        System.debug(query);

        List<Attachment> attachments = Database.query(query);
        return attachments;
    }

    @AuraEnabled
    public static List<Attachment> queryFiles(Id recordId, List<Id> attachmentIds) {
        List<Attachment> attachments = new List<Attachment>();

        attachments = [SELECT Id, Name, CreatedDate, ContentType, BodyLength
                       FROM Attachment
                       WHERE ParentId = :recordId AND Id IN :attachmentIds];

        return attachments;
    }

    private static String generateConditionString(List<String> filters) {
        String conditionString = '';
        if (filters != null && !filters.isEmpty()) {
            conditionString += ' AND (';
            Boolean firstFilter = true;
            for (String filter : filters) {
                if (mapConditionByFilter.containsKey(filter)) {
                    if (!firstFilter) {
                        conditionString += ' OR ';
                    }
                    conditionString += mapConditionByFilter.get(filter);
                    firstFilter = false;
                }
            }
            conditionString += ')';
        }
        return conditionString;
    }

    private static String generateQuery(Id recordId, List<String> filters, Integer defaultLimit, Integer offset, String sortField, String sortOrder) {
        String query = 'SELECT Id, Name, CreatedDate, ContentType, BodyLength ';
        query += 'FROM Attachment ';
        query += 'WHERE ParentId = \'' + recordId + '\'';

        query += generateConditionString(filters);

        query += ' ORDER BY ' + sortField + ' ' + sortOrder;
        query += ' LIMIT ' + defaultLimit;

        if (offset != null) {
            query += ' OFFSET ' + offset;
        }

        return query;
    }

    public class FilesInformation {
        @AuraEnabled
        public Integer totalCount;
        @AuraEnabled
        public String documentForceUrl;
        @AuraEnabled
        public List<Attachment> attachments;
    }
}
