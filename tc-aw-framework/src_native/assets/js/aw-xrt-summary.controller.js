// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-xrt-summary.controller
 */
import * as app from 'app';
import logger from 'js/logger';
import 'js/xrtParser.service';
import 'js/appCtxService';
import 'js/editHandlerService';

/**
 * The name of the page that was last active in any xrt summary view. This is shared by all aw-xrt-summary which
 * means there should only be one aw-xrt-summary visible at any time.
 *
 * Moving this definition into controller will make it scoped to the controller instance, which means it will not
 * remember the last SWA tab that was selected when navigating between sublocations.
 */
var lastActivePageTitle = null;

/**
 * The controller for the aw-xrt-summary directive
 *
 * @class awXrtSummaryController
 * @memberof NgControllers
 */
app.controller( 'awXrtSummaryController', [
    '$scope',
    '$q',
    'xrtParserService',
    'appCtxService',
    'editHandlerService',
    function( $scope, $q, xrtParserService, appCtxService, editHandlerService ) {
        var self = this;

        /**
         * Static XRT commands that should be active when the view model is visible.
         *
         * @private
         * @member _staticXrtCommandIds
         * @memberOf NgControllers.awXrtSummaryController
         */
        var _staticXrtCommandIds = [ 'Awp0StartEdit', 'Awp0StartEditGroup', 'Awp0SaveEdits', 'Awp0CancelEdits' ];

        /**
         * Utility to destroy previous xrt view model and update
         *
         * @private
         * @method setXrtViewModel
         * @memberOf NgControllers.awXrtSummaryController
         *
         * @param newViewModel {Object} - New view model
         */
        var setXrtViewModel = function( newViewModel ) {
            if( $scope.xrtViewModel ) {
                $scope.xrtViewModel.destroy();
            }
            $scope.xrtViewModel = newViewModel;
        };

        /**
         * Set the new view model on scope and update the view
         *
         * @private
         * @method setViewModel
         * @memberOf NgControllers.awXrtSummaryController
         *
         * @param xrtViewModel {Object} - New view model
         */
        var setViewModel = function( xrtViewModel ) {
            //Update view
            setXrtViewModel( xrtViewModel );

            //Revert to parent selection selection
            $scope.$emit( 'dataProvider.selectionChangeEvent', {
                selected: []
            } );

            //Update context with rendered page
            var rp = $scope.xrtViewModel.renderedPage;
            self.updateXrtPageContext( rp.titleKey );

            //Ensure last active page title is the page that is actually rendered currently
            lastActivePageTitle = rp.titleKey ? rp.titleKey : rp.displayTitle;

            //Update xrt pages
            $scope.xrtPages = xrtParserService.getDeclVisiblePages( xrtViewModel.viewModel ).map(
                function( page, idx ) {
                    return {
                        //Tab requirements
                        displayTab: true,
                        name: page.displayTitle,
                        pageId: idx,
                        selectedTab: page.selected,
                        tabKey: page.titleKey,
                        //XRT specific data
                        page: page
                    };
                } );
        };

        /**
         * Update the xrt page id in the app context
         *
         * @method updateXrtPageContext
         * @memberOf NgControllers.awXrtSummaryController
         *
         * @param newVal {String} - New secondaryXrtPageID
         */
        self.updateXrtPageContext = function( newVal ) {
            //Update context with rendered page
            appCtxService.updatePartialCtx( 'xrtPageContext.secondaryXrtPageID', newVal );

            //Necessary to clear object set defaultSelection here since it's set outside of object set
            if( !newVal ) {
                appCtxService.unRegisterCtx( 'objectSetDefaultSelection' );
            }
        };

        /**
         * Load the target page for the current MO.
         *
         * @method loadXrt
         * @memberOf NgControllers.awXrtSummaryController
         *
         * @param {String} page - Page to load for
         *
         * @return {Promise} Promise containing the loaded page. If MO changes while loading promise will be
         *         rejected.
         */
        self.loadXrt = function( page ) {
            //Make a function scoped reference to the model object to detect if it changes while loading XRT
            var modelObject = $scope.modelObject;
            if( modelObject ) {
                return xrtParserService.getXrtViewModel( 'SUMMARY', page, modelObject, _staticXrtCommandIds ).then(
                    function( xrtViewModel ) {
                        //If the model object has changed while XRT was loading just drop the response
                        if( $scope.modelObject === modelObject ) {
                            //Update view
                            return xrtViewModel;
                        }
                        //Destroy the viewModel since it is not being used
                        if( xrtViewModel && xrtViewModel.destroy ) {
                            xrtViewModel.destroy();
                        }
                        return $q.reject( 'Data changed while loading XRT' );
                    } );
            }
            return $q.reject( 'No MO provided' );
        };

        /**
         * Reload the xrt for the current page
         *
         * @method reloadCurrentPage
         * @memberOf NgControllers.awXrtSummaryController
         */
        self.reloadCurrentPage = function() {
            //Clear previous xrt view model
            setXrtViewModel( null );

            //Load xrt for updated MO (if provided)
            if( $scope.modelObject ) {
                self.loadXrt( lastActivePageTitle ).then( setViewModel );
            }
        };

        /**
         * Do any cleanup necessary on destroy
         *
         * @method cleanup
         * @memberOf NgControllers.awXrtSummaryController
         */
        self.cleanup = function() {
            //Reset the xrt page context when leaving
            self.updateXrtPageContext( null );
            //Clear previous xrt view model
            setXrtViewModel( null );
        };

        /**
         * Tab callback function. Called with the name and id of the tab that was selected
         *
         * Note: This must be defined within the controller instead of link as aw-tab-container will make a copy
         * while it is being initialized (instead of referencing directly), which happens before link
         *
         * @param id {String} - Tab id
         * @param tabTitle {String} - Tab title
         */
        $scope.api = function( id, tabTitle ) {
            //Determine which tab to select based on the name / id
            var tabToSelect = $scope.xrtPages.filter( function( tab ) {
                return tab.pageId === id || tab.name === tabTitle;
            } )[ 0 ];

            if( !tabToSelect ) {
                //User clicked a tab that isn't there - something is broken
                logger.error( 'Tab with title ' + tabTitle + ' or id ' + id + ' not found.' );
            }

            //If the page is not already displayed
            if( !$scope.xrtViewModel || tabToSelect.page !== $scope.xrtViewModel.renderedPage ) {
                const loadNewPage = function() {
                    //Clear previous xrt view model
                    setXrtViewModel( null );

                    //Load the content for the new page
                    self.loadXrt( tabToSelect.tabKey ? tabToSelect.tabKey : tabToSelect.name ).then(
                        setViewModel );
                };

                //Call leave confirmation to ensure edits are finished for all non pwa edit handlers
                const pwaEdithandler = editHandlerService.getEditHandler( 'TABLE_CONTEXT' );
                const pwaEditHandlerInProgress = pwaEdithandler && pwaEdithandler.editInProgress();
                if( pwaEditHandlerInProgress ) {
                    loadNewPage();
                } else {
                    editHandlerService.leaveConfirmation().then( function() {
                        loadNewPage();
                    } );
                }

            }
        };
    }
] );
