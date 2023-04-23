// Copyright (c) 2020 Siemens

/**
 * Please refer {@link https://gitlab.industrysoftware.automation.siemens.com/Apollo/afx/wikis/clipboard|Clipboard}
 *
 * @module js/clipboardService
 * @publishedApolloService
 */
import app from 'app';
import logger from 'js/logger';
import declUtils from 'js/declUtils';
import cfgSvc from 'js/configurationService';

// service
import AwPromiseService from 'js/awPromiseService';
import AwBaseService from 'js/awBaseService';
export default class ClipboardService extends AwBaseService {
    constructor() {
        super();

        this._delegateService = null;

        let dep;
        let solution;

        // Asynchronously loading the configured clipboardService
        cfgSvc.getCfg( 'solutionDef' ).then( ( solutionDef ) => {
            solution = solutionDef;

            if( solution.clipboard ) {
                return cfgSvc.getCfg( 'clipboard' );
            }

            return AwPromiseService.instance.reject( 'Missing configuration for \'clipboard\' in solution configuration.' );
        } ).then( ( clipboardProviders ) => {
            dep = clipboardProviders[ solution.clipboard ].dep;

            return declUtils.loadDependentModule( dep );
        } ).then( ( depModuleObj ) => {
            if( !depModuleObj ) {
                logger.error( 'Could not load the clipboard module ' + dep );
            }

            this._delegateService = depModuleObj;
        } ).catch( ( e ) => {
            logger.warn( e );
        } );
    }

    /**
     * Return an array of Objects currently on the clipboard.
     *
     * @memberof clipboardService
     *
     * @return {Array} Current contents of the clipboard.
     */
    getContents() {
        return this._delegateService ? this._delegateService.getContents() : [];
    }

    /**
     * Sets the current contents of the clipboard.
     *
     * @param {Array} contentsToSet - Array of Objects to set as the current clipboard contents.
     *
     */
    setContents( contentsToSet ) {
        if( this._delegateService ) {
            this._delegateService.setContents( contentsToSet );
        }
    }

    /**
     * Return the content of the clipboard that is cached.
     *
     * @return {Array} Array of current Objects that is cached.
     */
    getCachableObjects() {
        return this._delegateService ? this._delegateService.getCachableObjects() : [];
    }

    /**
     * Copies the URL for the given object to OS clipboard
     *
     * @memberof clipboardService
     *
     * @param {Object} selObject - selected object
     *
     * @return {Boolean} verdict whether the content was successfully copied to the clipboard or not
     */
    copyUrlToClipboard( selObject ) {
        return this._delegateService ? this._delegateService.copyUrlToClipboard( selObject ) : false;
    }

    /**
     * Copies hyperlink to OS clipboard
     *
     * @param {Array} content - array of selected object whose hyperlink is created and copied to os clipboard
     * @return {Boolean} successful whether the content was successfully copied to the clipboard or not
     */
    copyHyperlinkToClipboard( content ) {
        return this._delegateService ? this._delegateService.copyHyperlinkToClipboard( content ) : false;
    }
}

/**
 * Register service.
 *
 * @member clipboardService
 * @memberof NgServices
 *
 * @param {$q} $q - Service to use.
 * @param {$injector} $injector - Service to use.
 * @param {configurationService} cfgSvc - Service to use.
 *
 * @returns {clipboardService} Reference to service's API object.
 */
app.factory( 'clipboardService', () => ClipboardService.instance );
