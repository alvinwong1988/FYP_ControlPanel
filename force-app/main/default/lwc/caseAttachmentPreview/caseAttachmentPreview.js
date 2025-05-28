import { LightningElement, api, wire, track } from 'lwc';
import { getRelatedFilesByRecordId } from 'lightning/uiRelatedListApi';

export default class CaseAttachmentPreview extends LightningElement {
    @api recordId; // Automatically passed by Salesforce (Case record ID)
    @track files = [];
    @track error;
    @track previewUrl = '';
    @track hasFiles = false;

    // Define columns for the datatable
    columns = [
        { label: 'File Name', fieldName: 'Title', type: 'text' },
        { label: 'File Type', fieldName: 'FileExtension', type: 'text' },
        { label: 'Size', fieldName: 'ContentSize', type: 'text' },
        { type: 'action', typeAttributes: { rowActions: [{ label: 'Preview', name: 'preview' }] } }
    ];

    // Fetch related files using the wire service
    @wire(getRelatedFilesByRecordId, { recordId: '$recordId' })
    wiredFiles({ error, data }) {
        if (data) {
            this.files = data.files.map(file => ({
                Id: file.contentDocumentId,
                Title: file.title,
                FileExtension: file.fileExtension,
                ContentSize: this.formatFileSize(file.contentSize)
            }));
            this.hasFiles = this.files.length > 0;
            this.error = undefined;
        } else if (error) {
            this.error = error.body?.message || 'Unknown error';
            this.files = undefined;
            this.hasFiles = false;
        }
    }

    // Format file size for display
    formatFileSize(size) {
        if (size < 1024) return size + ' B';
        else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
        else return (size / 1048576).toFixed(1) + ' MB';
    }

    // Handle row action (Preview button)
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'preview') {
            // Construct the preview URL using the ContentDocument ID
            // This URL points to Salesforce's file download servlet
            this.previewUrl = `/sfc/servlet.shepherd/document/download/${row.Id}`;
        }
    }
}
