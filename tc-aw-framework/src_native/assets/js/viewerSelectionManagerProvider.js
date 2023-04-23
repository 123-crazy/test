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
 * This service is create viewer context data
 *
 * @module js/viewerSelectionManagerProvider
 */
import * as app from 'app';
import viewerPreferenceService from 'js/viewerPreference.service';
import _ from 'lodash';
import assert from 'assert';
import 'jscom';
import 'manipulator';

var exports = {};

/**
 * Viewer preference service
 */

/**
 * Provides an instance of viewer selection manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerSelectionManager} Returns viewer selection manager
 */
export let getViewerSelectionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerSelectionManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer context data
 *
 * @constructor ViewerSelectionManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerSelectionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var m_viewerContextNamespace = viewerCtxNamespace;
    var m_viewerView = viewerView;
    var m_viewerContextData = viewerContextData;

    var m_viewerSelectionChangedListeners = [];

    /**
     * Set selection enabled or disabled
     *
     * @param {boolean} isEnabled should selection be enabled
     */
    self.setSelectionEnabled = function( isEnabled ) {
        m_viewerView.selectionMgr.setSelectionEnabled( isEnabled );
    };

    /**
     * Get selected model objects
     *
     * @return {Array} Array of selected model objects
     */
    self.getSelectedModelObjects = function() {
        return m_viewerContextData.getViewerCtxSvc().getViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_MODEL_OBJECT_SELECTION_TOKEN );
    };

    /**
     * Get selected csids
     *
     * @return {Array} Array of selected csids
     */
    self.getSelectedCsids = function() {
        return m_viewerContextData.getViewerCtxSvc().getViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN );
    };

    /**
     * Get selected csids
     *
     * @return {Array} Array of selected csids
     */
    self.getSelectedPartitionCsids = function() {
        return m_viewerContextData.getViewerCtxSvc().getViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_PARTITION_CSID_SELECTION_TOKEN );
    };

    /**
     * Select parts in viewer using Model objects
     *
     * @param {Array} modelObjectsArray List of Model Objects to be selected in viewer
     */
    self.selectPartsInViewerUsingModelObject = function( modelObjectsArray ) {
        // We need to add a new server side SOA call that will return the csid chain for given model objects
        if( _checkIfModelObjectSelectionsAreEqual( modelObjectsArray ) ) {
            return;
        }
        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_MODEL_OBJECT_SELECTION_TOKEN, modelObjectsArray );
    };

    /**
     * Select parts in viewer using CSID
     *
     * @param {Array} csidChainArray List of CSIDs to be selected in viewer
     */
    self.selectPartsInViewerUsingCsid = function( csidChainArray ) {
        if( _checkIfCsidSelectionsAreEqual( csidChainArray ) ) {
            return;
        }
        self.selectPartsInViewer( csidChainArray );
    };

    /**
     * Select parts in viewer using CSID
     *
     * @param {Array} csidChainArray List of CSIDs to be selected in viewer
     */
    self.selectPartsInViewer = function( csidChainArray ) {
        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN, csidChainArray );

        var occurrences = [];
        _.forEach( csidChainArray, function( csidChain ) {
            var occ = m_viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
            occurrences.push( occ );
        } );
        m_viewerView.selectionMgr.select( occurrences );
    };

    /**
     * Select parts and partitions in viewer using CSID
     *
     * @param {Array} csidChainArray List of CSIDs to be selected in viewer
     * @param {Array} partitionChainArray List of CSIDs to be selected in viewer
     *
     * @returns {Promise} A promise that is resolved after selection
     */
    self.selectPartsInViewerUsingCsidWithPartitions = function( csidChainArray, partitionChainArray ) {
        var occurrences = [];
        if( Array.isArray( partitionChainArray ) && partitionChainArray.length > 0 ) {
            _.forEach( partitionChainArray, function( partitionChain ) {
                var occ = m_viewerContextData.getViewerCtxSvc().createViewerPartitionOccurance( partitionChain );
                occurrences.push( occ );
            } );
        }
        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN, _.concat( csidChainArray, partitionChainArray ) );

        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_PARTITION_CSID_SELECTION_TOKEN, partitionChainArray );

        _.forEach( csidChainArray, function( csidChain ) {
            let occ = null;
            if( partitionChainArray && Array.isArray( partitionChainArray ) && partitionChainArray.length > 0 ) {
                if( !_.includes( partitionChainArray, csidChain ) ) {
                    occ = m_viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
                    occurrences.push( occ );
                }
            } else {
                occ = m_viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
                occurrences.push( occ );
            }
        } );

        return m_viewerView.selectionMgr.select( occurrences );
    };

    /**
     * Set active partition
     *
     * @param {String} partitionSchemeUid Partition scheme uid
     */
    self.setActivePartitionScheme = function( csidChainArray ) {
        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN, csidChainArray );
        var occurrences = [];
        _.forEach( csidChainArray, function( csidChain ) {
            var occ = m_viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
            occurrences.push( occ );
        } );
        m_viewerView.selectionMgr.select( [] );
        m_viewerContextData.getThreeDViewManager().setContext( occurrences );
    };

    /**
     * Select context in viewer using CSID.
     *
     * @param {Array} csidChainArray List of CSIDs to be selected in viewer
     */
    self.selectContextInViewerUsingCsid = function( csidChainArray ) {
        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN, csidChainArray );

        var occurrences = [];
        _.forEach( csidChainArray, function( csidChain ) {
            var occ = m_viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
            occurrences.push( occ );
        } );
        m_viewerView.selectionMgr.select( occurrences );
        var srUidsArray = [];
        _notifyViewerSelectionChanged( csidChainArray, srUidsArray );
    };

    /**
     * Set context in viewer
     *
     * @param {Array} csidChainArray List of CSIDs to be set as context in viewer
     */
    self.setContext = function( csidChainArray ) {
        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN, csidChainArray );
        var occurrences = [];
        _.forEach( csidChainArray, function( csidChain ) {
            var occ = m_viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
            occurrences.push( occ );
        } );
        m_viewerView.selectionMgr.select( [] );
        m_viewerContextData.getThreeDViewManager().setContext( occurrences );
    };
    /**
     * Add viewer selection changed listener
     *
     * @param {Object} observerFunction function to be registered
     */
    self.addViewerSelectionChangedListener = function( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            m_viewerSelectionChangedListeners.push( observerFunction );
        }
    };

    /**
     * remove viewer selection changed listener
     *
     * @param {Object} observerFunction function to be removed
     */
    self.removeViewerSelectionChangedListener = function( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = m_viewerSelectionChangedListeners.indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                m_viewerSelectionChangedListeners.splice( indexToBeRemoved, 1 );
            }
        }
    };

    /**
     * set multi-select mode in viewer
     *
     * @param {Boolean} isMultiSelectEnabled true if multi-selection should be enabled in viewer
     */
    self.setMultiSelectModeInViewer = function( isMultiSelectEnabled ) {
        m_viewerView.selectionMgr.setMultiSelectState( isMultiSelectEnabled );
    };

    /**
     * Check if selections are equal
     *
     * @param {Array} occCSIDChains Array of CSID chain of selected occurrences
     */
    var _checkIfCsidSelectionsAreEqual = function( csidChainArray ) {
        var currentlySelectedCSIDs = m_viewerContextData.getViewerCtxSvc().getViewerApplicationContext(
            m_viewerContextNamespace, m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN );
        if( !currentlySelectedCSIDs || _.xor( csidChainArray, currentlySelectedCSIDs ).length !== 0 ) {
            return false;
        }
        return true;
    };

    /**
     * Check if selections are equal
     *
     * @param {Array} modelObjectsArray Array of selected model objects
     */
    var _checkIfModelObjectSelectionsAreEqual = function( modelObjectsArray ) {
        var currentlySelectedModelObjects = m_viewerContextData.getViewerCtxSvc()
            .getViewerApplicationContext( m_viewerContextNamespace,
                m_viewerContextData.getViewerCtxSvc().VIEWER_MODEL_OBJECT_SELECTION_TOKEN );
        if( !currentlySelectedModelObjects ||
            _.xor( modelObjectsArray, currentlySelectedModelObjects ).length !== 0 ) {
            return false;
        }
        return true;
    };

    /**
     * Notify viewer selection changed listener
     *
     * @param {Array} occCSIDChains Array of CSID chain of selected occurrences
     */
    var _notifyViewerSelectionChanged = function( occCSIDChains, bomLineSRUIDs ) {
        m_viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( m_viewerContextNamespace,
            m_viewerContextData.getViewerCtxSvc().VIEWER_CSID_SELECTION_TOKEN, occCSIDChains );
        if( m_viewerSelectionChangedListeners.length > 0 ) {
            _.forEach( m_viewerSelectionChangedListeners, function( observer ) {
                observer.call( m_viewerContextData, occCSIDChains, bomLineSRUIDs );
            } );
        }
    };

    /**
     * Viewer selection changed handler
     *
     * @param {Array} occurrences The array of Occurrence ID Chains and SRUids
     */
    var _viewerSelectionChangedHandler = function( occurrences ) {
        var occCSIDChains = [];
        let bomLineSRUIDs = [];
        if( occurrences ) {
            _.forEach( occurrences, function( occurrence, key ) {
                if( occurrence.sruid ||  !_.isUndefined( occurrence.theStr ) && !_.isNull( occurrence.theStr )  ) {
                    if( occurrence.sruid !== undefined ) {
                        bomLineSRUIDs.push( occurrence.sruid );
                    }
                    occCSIDChains.push( _.endsWith( occurrence.theStr, '/' ) ? occurrence.theStr.substring( 0, occurrence.theStr.lastIndexOf( '/' ) ) : occurrence.theStr );
                }
            } );
            _notifyViewerSelectionChanged( occCSIDChains, bomLineSRUIDs );
        }
    };

    /**
     * Viewer selection display style
     *
     * @param {@link SelectionDisplayStyle} selectionDisplayStyle selection display style to be applied
     *
     * @return {Void}
     */
    self.setViewerSelectionDisplayStyle = function( selectionDisplayStyle ) {
        m_viewerContextData.getThreeDViewManager().setSelectionDisplayStyle( selectionDisplayStyle );
    };

    /**
     * Viewer context display style
     *
     * @param contextDisplayStyle context display style to be applied
     *
     * @return {Void}
     */
    self.setViewerContextDisplayStyle = function( contextDisplayStyle ) {
        m_viewerContextData.getThreeDViewManager().setContextDisplayStyle( contextDisplayStyle );
    };

    m_viewerView.selectionMgr.addSelectionListener( _viewerSelectionChangedHandler );

    viewerPreferenceService
        .getViewerPreferences()
        .then(
            function( viewerPrefs ) {
                if( viewerPrefs.selection.selectionDisplayStyle === viewerPreferenceService.SelectionDisplayStyle.BBOX_GRAYSEETHRU ) {
                    self
                        .setViewerContextDisplayStyle( viewerPreferenceService.ContextDisplayStyle.COLOREDSEETHRU );
                } else if( viewerPrefs.selection.selectionDisplayStyle === viewerPreferenceService.SelectionDisplayStyle.HIGHLIGHT ) {
                    self.setViewerContextDisplayStyle( viewerPreferenceService.ContextDisplayStyle.NONE );
                }
            } );
};

export default exports = {
    getViewerSelectionManager
};
/**
 * This service is used to get ViewerSelectionManager
 *
 * @memberof NgServices
 */
app.factory( 'viewerSelectionManagerProvider', () => exports );
