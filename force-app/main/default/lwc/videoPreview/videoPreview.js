import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getVideosForRecord from '@salesforce/apex/VideoPreviewController.getVideosForRecord';

export default class VideoPreview extends LightningElement {
    @api recordId; // The ID of the parent record (e.g., Case ID)
    @track videos = []; // Array to store video metadata
    @track isLoaded = false; // Flag to show/hide loading spinner
    @track noVideos = false; // Flag to indicate if no videos are found
    @track error = ''; // Error message if something goes wrong

    // Wire method to fetch videos when the component loads
    @wire(getVideosForRecord, { recordId: '$recordId' })
    wiredVideos({ error, data }) {
        console.log('Fetching videos for record ID:', this.recordId);
        // Check if data is available and set component state accordingly
        console.log('Data received:', data);
        console.log('Error received:', error);
        if (data) {
            this.videos = data;
            this.isLoaded = true;
            this.noVideos = data.length === 0;
            this.error = '';
        } else if (error) {
            this.error = error.body?.message || 'Unknown error occurred while fetching videos.';
            this.isLoaded = true;
            this.noVideos = false;
            console.error('Error fetching videos:', error);
        }
    }

    // Handle video load event
    handleVideoLoad(event) {
        const videoId = event.currentTarget.dataset.id;
        console.log('Video loaded successfully for ID:', videoId);
        // Add any additional logic for successful load (e.g., tracking views)
    }

    // Handle video error event (e.g., unsupported format or access issue)
    handleVideoError(event) {
        const videoElement = event.target;
        const videoUrl = videoElement.src;
        const error = videoElement.error; // Access the MediaError object
        let errorMessage = 'Unknown error';

        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    errorMessage = 'Video loading was aborted by the user.';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    errorMessage = 'A network error occurred while loading the video.';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    errorMessage = 'The video could not be decoded due to corruption or unsupported format.';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'The video source or format is not supported by the browser.';
                    break;
                default:
                    errorMessage = 'An unknown media error occurred.';
            }
            console.error('Video load error for URL:', videoUrl);
            console.error('Error code:', error.code);
            console.error('Error message:', errorMessage);
            console.error('Full error object:', error);
        } else {
            console.error('Video load error for URL:', videoUrl);
            console.error('No detailed error information available. Event:', event);
        }

        // Show a user-friendly message
        this.showToast('Error', `Failed to load video: ${errorMessage}`, 'error');
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }
}
