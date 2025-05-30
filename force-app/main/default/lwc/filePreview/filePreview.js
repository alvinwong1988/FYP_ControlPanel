/*
    @author Gil Avignon
    @date 2020-05-10
    @description File Preview Client-side Controller for Attachments
*/
import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from 'lightning/navigation';
import initFiles from "@salesforce/apex/FilePreviewController.initFiles";
import queryFiles from "@salesforce/apex/FilePreviewController.queryFiles";
import loadFiles from "@salesforce/apex/FilePreviewController.loadFiles";

export default class FilePreview extends NavigationMixin(LightningElement) {
    @api recordId;
    @api defaultNbFileDisplayed;
    @api limitRows;

    @track moreLoaded = true;
    @track loaded = false;
    @track attachments;
    @track totalFiles;
    @track moreRecords;
    @track offset=0;
    @track fids = '';
    @track sortIcon = 'utility:arrowdown';
    @track sortOrder = 'DESC';
    @track sortField = 'CreatedDate'; // Updated to Attachment field
    @track disabled = true;
    @track filters = [
        {
            'id' : 'gt100KB',
            'label' : '>= 100 KB',
            'checked' : true
        },
        {
            'id' : 'lt100KBgt10KB',
            'label' : '< 100 KB and > 10 KB',
            'checked' : true
        },
        {
            'id' : 'lt10KB',
            'label' : '<= 10 KB',
            'checked' : true
        }
    ];

    title;
    conditions;
    documentForceUrl;

    get DateSorted() {
        return this.sortField == 'Name';
    }
    get NameSorted() {
        return this.sortField == 'Name';
    }
    get SizeSorted() {
        return this.sortField == 'BodyLength';
    }
    get noRecords(){
        return this.totalFiles == 0;
    }

    // Initialize component
    connectedCallback() {
        console.log('FilePreview component initialized with recordId:', this.recordId);
        this.initRecords();
    }

    initRecords(){
        initFiles({ recordId: this.recordId, filters: this.conditions, defaultLimit: this.defaultNbFileDisplayed, sortField: this.sortField, sortOrder: this.sortOrder })
        .then(result => {
            this.fids = '';
            let listAttachments = new Array();
            let attachments = result.attachments; // Updated to use 'attachments' from Apex response
            this.documentForceUrl = result.documentForceUrl;
            console.log(result);
            for(var item of attachments){
                listAttachments.push(this.calculateFileAttributes(item));
                if (this.fids != '') this.fids += ',';
                this.fids += item.Id; // Using Attachment Id instead of ContentDocumentId
            }

            this.attachments = listAttachments;
            this.totalFiles = result.totalCount;
            this.moreRecords = result.totalCount > 3 ? true : false;

            let nbFiles = listAttachments.length;
            if (this.defaultNbFileDisplayed === undefined){
                this.defaultNbFileDisplayed = 3;
            }
            if (this.limitRows === undefined){
                this.limitRows = 3;
            }

            this.offset = this.defaultNbFileDisplayed;

            if(result.totalCount > this.defaultNbFileDisplayed){
                nbFiles = this.defaultNbFileDisplayed + '+';
            }
            this.title = 'Files (' + nbFiles + ')';

            this.disabled = false;
            this.loaded = true;

            console.log(attachments);
        })
        .catch(error => {
            this.showNotification("", "Error", "error");
        });
    }

    calculateFileAttributes(item){
        let imageExtensions = ['png','jpg','gif'];
        let supportedIconExtensions = ['ai','attachment','audio','box_notes','csv','eps','excel','exe','flash','folder','gdoc','gdocs','gform','gpres','gsheet','html','image','keynote','library_folder','link','mp4','overlay','pack','pages','pdf','ppt','psd','quip_doc','quip_sheet','quip_slide','rtf','slide','stypi','txt','unknown','video','visio','webex','word','xml','zip'];
        // Updated URL construction for Attachment preview (using servlet for direct download or preview)
        item.src = '/servlet/servlet.FileDownload?file=' + item.Id;
        item.size = this.formatBytes(item.BodyLength, 2); // Using BodyLength instead of ContentSize
        item.icon = 'doctype:attachment';

        let fileType = item.ContentType ? item.ContentType.toLowerCase().split('/')[1] : ''; // Extract file type from ContentType if available
        if(imageExtensions.includes(fileType)){
            item.icon = 'doctype:image';
        }else{
            if(supportedIconExtensions.includes(fileType)){
                item.icon = 'doctype:' + fileType;
            }
        }

        return item;
    }

    // Manage Image Preview display if the image is loaded
    handleLoad(event){
        let elementId = event.currentTarget.dataset.id;
        const eventElement = event.currentTarget;
        eventElement.classList.remove('slds-hide');
        let dataId = 'lightning-icon[data-id="' + elementId + '"]';

        this.template.querySelector(dataId).classList.add('slds-hide');
    }

    openPreview(event){
        let elementId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: elementId,
                objectApiName: 'Attachment',
                actionName: 'view'
            }
        });
    }

    openFileRelatedList(){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Case',
                relationshipApiName: 'Attachments', // Updated to use Attachments relationship
                actionName: 'view'
            },
        });
    }

    handleUploadFinished(event) {
        var self = this;
        // Get the list of uploaded files
        const uploadedFiles = event.detail.files;
        var attachmentIds = new Array();
        for(var file of uploadedFiles){
            attachmentIds.push(file.documentId); // Assuming documentId maps to Attachment Id
        }
        queryFiles({ recordId: this.recordId, contentDocumentIds: attachmentIds }) // Updated parameter name if needed in Apex
        .then(result => {
            for(var attachment of result){
                self.attachments.unshift(self.calculateFileAttributes(attachment));
                self.fileCreated = true;
                this.fids = attachment.Id + (this.fids=='' ? '' : ',' + this.fids);
            }

            self.updateCounters(result.length);
            this.totalFiles += result.length;
        });
    }

    loadMore(){
        this.moreLoaded = false;
        var self = this;
        loadFiles({ recordId: this.recordId, filters: this.conditions, defaultLimit: this.defaultNbFileDisplayed, offset: this.offset, sortField: this.sortField, sortOrder: this.sortOrder })
        .then(result => {
            for(var attachment of result){
                self.attachments.push(self.calculateFileAttributes(attachment));
                self.fileCreated = true;
                if (this.fids != '') this.fids += ',';
                this.fids += attachment.Id; // Using Attachment Id
            }

            self.updateCounters(result.length);
            self.moreLoaded = true;
        });
    }

    updateCounters(recordCount){
        this.offset += recordCount;
        this.moreRecords = this.offset < this.totalFiles;
    }

    handleFilterSelect(event) {
        const selectedItemValue = event.detail.value;
        const eventElement = event.currentTarget;
        let conditions = new Array();
        for(var filter of this.filters){
            if(filter.id === selectedItemValue){
                filter.checked = !filter.checked;
            }
            if(filter.checked){
                conditions.push(filter.id);
            }
        }
        this.conditions = conditions;
        this.initRecords();
    }

    handleSort(event){
        this.disabled = true;

        let selectedValue = event.currentTarget.value;
        if(this.sortField === selectedValue){
            this.toggleSortOrder();
        }
        this.sortField = selectedValue;
        this.initRecords();
    }

    toggleSortOrder(){
        if(this.sortOrder == 'ASC'){
            this.sortOrder = 'DESC';
            this.sortIcon = 'utility:arrowdown';
        }else{
            this.sortOrder = 'ASC';
            this.sortIcon = 'utility:arrowup';
        }
    }

    formatBytes(bytes, decimals) {
        if(bytes == 0) return '0 Bytes';
        var k = 1024,
            dm = decimals || 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }
}
