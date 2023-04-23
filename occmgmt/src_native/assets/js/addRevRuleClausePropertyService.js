//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/addRevRuleClausePropertyService
 */
import app from 'app';
import revisionRuleAdminCtx from 'js/revisionRuleAdminContextService';
import revRuleClauseDisplayTextService from 'js/revRuleClauseDisplayTextService';
import cdmSvc from 'soa/kernel/clientDataModel';
import viewModelObjectSvc from 'js/viewModelObjectService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var _user = 'User';
var _group = 'Group';
var _status = 'Status';
var _anyStatus = 'Any';
var _release_event = 'Fnd0ReleaseEvent';
var ADDCLAUSE_PREFIX = 'addClause_';

function getSelectedClauseIndex( data ) {
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    return dataProvider.getSelectedIndexes()[ 0 ];
}

function getSelectedClause( data ) {
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    var clauses = dataProvider.viewModelCollection.getLoadedViewModelObjects();
    return clauses[ getSelectedClauseIndex( data ) ];
}

/**
 * check for repeated clauses after modification
 *
 * @param {Object} data - data
 * @param {String} clauseToBeUpdated - clause to update
 * @param {String} displayText - display text for new clause
 *
 */
function checkSimilarClauseInRevRule( data, clauseToBeUpdated, displayText ) {
    var similarClauseFound = false;
    if( data.clauses ) {
        for( var inx = 0; inx < data.clauses.length; inx++ ) {
            var clauseFound = _.isEqual( data.clauses[ inx ].displayText, displayText );
            if( clauseFound ) {
                if( data.exactlySameClauseWarning ) {
                    //give warning to user incase after modification clauses become exactly same
                    data.exactlySameClauseWarning.dbValue = true;
                    clauseToBeUpdated.isRepeated = true;
                    similarClauseFound = true;
                    break;
                }
            }
        }
    }
    if( !similarClauseFound && clauseToBeUpdated.isRepeated ) {
        //clause is no longer repeated
        clauseToBeUpdated.isRepeated = false;

        //make warning invisible
        if( data.exactlySameClauseWarning ) {
            data.exactlySameClauseWarning.dbValue = false;
         }
    }
}

/**
 * Create clause property for new added clause
 *
 * @param {Object} data - data
 * @param {String} clauseToBeUpdated - clause to update
 * @param {String} displayText - display text for new clause
 *
 */
function modifyClauseProperty( data, clauseToBeUpdated, displayText ) {
    // check if similar clause with same property already exist to give user warning.
    if( clauseToBeUpdated.entryType !== 3 && clauseToBeUpdated.entryType !== 4 && clauseToBeUpdated.entryType !== 8 && clauseToBeUpdated.entryType !== 13 ) {
        checkSimilarClauseInRevRule( data, clauseToBeUpdated, displayText );
    }
    clauseToBeUpdated.displayText = displayText;
    clauseToBeUpdated.modified = true;
    eventBus.publish( 'RevisionRuleAdminPanel.tagRevisionRuleAsModified' );
    var index = getSelectedClauseIndex( data );
    data.clauses[ index ] = clauseToBeUpdated;
    //dataProvider.update( clauses, clauses.length );
}

/**
 * Create clause property for new added clause
 *
 * @param {Object} clauseToBeCreated - clause to create
 * @param {String} displayText - display text for new clause
 *
 */
function createClausePropertyForAddClause( clauseToBeCreated, displayText ) {
    clauseToBeCreated.displayText = displayText;
    clauseToBeCreated.groupEntryInfo = {
        listOfSubEntries: []
    };
}

function canUpdateClauseProperty( data ) {
    return data.activeView === 'RevisionRuleAdminPanel' &&
        _.get( data, 'eventData.oldValue' ) !== undefined &&
        _.get( data, 'eventData.newValue' ) !== undefined &&
        data.eventData.oldValue.toString() !== data.eventData.newValue.toString();
}

/**
 * Update Working clause text
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 *
 */
function updateWorkingClauseText( data ) {
    var clauseToBeUpdated = getSelectedClause( data );
    exports.getUpdatedWorkingClause( data, clauseToBeUpdated, false );
}

/**
 * Get clause property type based on clause selected from RevisionRule Panel or AddClause panel
 *
 * @param {String} clauseType - clause property type
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @return {String} clauseType - clause property type based on clause selected from RevisionRule panel or AddClause panel
 *
 */
function getClausePropertiesType( clauseType, data ) {
    var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
    var isSelectedFromAddPanel = false;
    if( subPanelContext ) {
        isSelectedFromAddPanel = subPanelContext.activeView && subPanelContext.activeView === 'AddClauses';
    }
    if( isSelectedFromAddPanel ) {
        clauseType = ADDCLAUSE_PREFIX + clauseType;
    }
    return clauseType;
}

/**
 * Update Status clause text
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 *
 */
function updateStatusClauseText( data ) {
    var clauseToBeUpdated = getSelectedClause( data );
    if( clauseToBeUpdated.entryType === 1 ) {
        exports.getUpdatedStatusClause( data, clauseToBeUpdated, false );
    }
}
/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * launch the Panel to Add/Replace clause property
 *
 * @param {Object} currentlySelectedClause - currently selected clause
 * @param {String} panelTitle - Title of the panel to be opened (Add/Replace)
 *
 */
export let launchClauseUpdatePropertyPanel = function( currentlySelectedClause, panelTitle, isForAddClause ) {
    var typeFilter = null;
    var title = null;
    switch ( currentlySelectedClause.dbValue ) {
        case 2:
            typeFilter = 'Folder';
            title = 'Folder';
            break;
        case 8:
            typeFilter = 'Item';
            title = 'End Item';
            break;
        case 13:
            typeFilter = 'Fnd0ReleaseEvent';
            title = 'Release Event';
            break;
        case 10:
            typeFilter = 'Fnd0Branch';
            title = 'Branch';
            break;
        default:
            break;
    }

    title = panelTitle + ' ' + title;

    if( typeFilter !== null ) {
        var context = {
            destPanelId: 'AddClausePropertyPanel',
            title: title,
            recreatePanel: true,
            supportGoBack: true,
            isolateMode: true,
            typeFilter: typeFilter,
            isForAddClause: isForAddClause
        };
        eventBus.publish( 'awPanel.navigate', context );
    }
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'isAddClausePropertyPanelLoaded', true );
};

/**
 * process the SOA response for "getSubTypeNames" and update the typeNames for which search should be done
 *
 * @param {Object} response - response of the SOA
 * @param {DeclViewModel} data - GetClausePropertyBySearchViewModel
 *
 */
export let processSoaResponseForBOTypes = function( response, data ) {
    var typeNames = null;
    if( response.output ) {
        for( var ii = 0; ii < response.output.length; ii++ ) {
            var displayableBOTypeNames = response.output[ ii ].subTypeNames;
            typeNames = displayableBOTypeNames[ 0 ];

            for( var jj = 1; jj < displayableBOTypeNames.length; jj++ ) {
                typeNames = typeNames + ';' + displayableBOTypeNames[ jj ];
            }
        }
    }

    data.typeNames = typeNames;
};

/**
 * get Search Criteria for input to performSearchViewModel4 SOA
 *
 * @param {DeclViewModel} data - GetClausePropertyBySearchViewModel
 * @param {int} startIndex - current index of the searchFolders dataProvider
 *
 */
export let getSearchCriteria = function( data, startIndex ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var searchCriteria = {};
    searchCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    searchCriteria.utcOffset = '0';

    if( ctx.search && startIndex > 0 ) {
        searchCriteria.totalObjectsFoundReportedToClient = ctx.search.totalFound.toString();
        searchCriteria.lastEndIndex = ctx.search.lastEndIndex.toString();
    } else {
        searchCriteria.totalObjectsFoundReportedToClient = '0';
        searchCriteria.lastEndIndex = '0';
    }
    searchCriteria.queryName = 'Quick';
    searchCriteria.Name = data.searchString.dbValue;
    searchCriteria.Type = data.typeNames;
    searchCriteria.ItemID = data.searchString.dbValue;

    return searchCriteria;
};

/**
 * update Clause Property in the RevisionRuleAdmin context with the selected one and navigate back to Revision Rule Panel
 *
 *  @param {Object} selection - currently selected clause property
 *
 */
export let updateClausePropertyAndNavigateToInformationPanel = function( selection ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.panelContext ) {
        var isForAddClause = ctx.panelContext.isForAddClause;
        var folder_type = 'folder';
        var endItem_type = 'end_item';
        var releaseEvent_type = 'release_event';
        var branch_type = 'branch';
        var currentlySelectedClauseProperty = 'currentlySelectedClauseProperty';
        if( isForAddClause ) {
            folder_type = ADDCLAUSE_PREFIX + folder_type;
            endItem_type = ADDCLAUSE_PREFIX + endItem_type;
            releaseEvent_type = ADDCLAUSE_PREFIX + releaseEvent_type;
            branch_type = ADDCLAUSE_PREFIX + branch_type;
            currentlySelectedClauseProperty = ADDCLAUSE_PREFIX + currentlySelectedClauseProperty;
        }
        switch ( ctx.panelContext.typeFilter ) {
            case 'Folder':
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( folder_type, selection );
                break;
            case 'Item':
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( endItem_type, selection );
                break;
            case 'Fnd0ReleaseEvent':
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( releaseEvent_type, selection );
                break;
            case 'Fnd0Branch':
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( branch_type, selection );
                break;
            default:
                break;
        }
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'isAddClausePropertyPanelLoaded', false );
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( currentlySelectedClauseProperty, selection );
        if( !isForAddClause ) {
            eventBus.publish( 'RevisionRuleAdminPanel.updateClauseProperties' );
        } else {
            var context = {
                destPanelId: 'AddClauses',
                title: 'Back',
                supportGoBack: true
            };
            eventBus.publish( 'awPanel.navigate', context );
        }
    }
};

/**
 * set Clause Property with the selected one from Palette section and navigate back to Revision Rule Panel
 *
 */
export let setClausePropertyAndNavigateToInformationPanel = function() {
    var ctx = revisionRuleAdminCtx.getCtx();
    var selectedObject = null;

    if( ctx.getClipboardProvider.selectedObjects.length !== 0 ) {
        selectedObject = ctx.getClipboardProvider.selectedObjects[ 0 ];
    } else if( ctx.getFavoriteProvider.selectedObjects.length !== 0 ) {
        selectedObject = ctx.getFavoriteProvider.selectedObjects[ 0 ];
    } else if( ctx.getRecentObjsProvider.selectedObjects.length !== 0 ) {
        selectedObject = ctx.getRecentObjsProvider.selectedObjects[ 0 ];
    }

    this.updateClausePropertyAndNavigateToInformationPanel( selectedObject );
};

/**
 * update Clause Property with the selected one and navigate back to Revision Rule Panel
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 *
 */
export let updateClauseProperties = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var clauses = data.dataProviders.getRevisionRuleInfoProvider.viewModelCollection.getLoadedViewModelObjects();
    var selectedIndex = data.dataProviders.getRevisionRuleInfoProvider.getSelectedIndexes();

    if( ctx.panelContext ) {
        switch ( ctx.panelContext.typeFilter ) {
            case 'Folder':
                exports.updateOverrideClauseText( data );
                break;
            case 'Item':
                exports.updateEndItemClauseText( data );
                break;
            case 'Fnd0ReleaseEvent':
                exports.updateReleaseEventClauseText( data );
                break;
            case 'Fnd0Branch':
                if( clauses[ selectedIndex ].revRuleEntryKeyToValue ) {
                    clauses[ selectedIndex ].revRuleEntryKeyToValue.branch = ctx.RevisionRuleAdmin.branch.uid;
                } else {
                    clauses[ selectedIndex ].revRuleEntryKeyToValue = {
                        branch: ctx.RevisionRuleAdmin.branch.uid
                    };
                }
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'currentlySelectedClauseProperty', ctx.RevisionRuleAdmin.branch.uid );
                break;
            default:
                break;
        }
    }
    var context = {
        destPanelId: 'RevisionRuleAdminPanel',
        title: 'Back',
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Get updated Status clause
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clauseToBeUpdated - modified/added clause
 * @param {Boolean} isForAddClause - true if clause is added from AddClause panel
 *
 */
export let getUpdatedStatusClause = function( data, clauseToBeUpdated, isForAddClause ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, isForAddClause );
    var status = 'status';
    var statusConfig = 'statusConfigType';
    if( isForAddClause ) {
        status = ADDCLAUSE_PREFIX + status;
        statusConfig = ADDCLAUSE_PREFIX + statusConfig;
    }

    clauseToBeUpdated.revRuleEntryKeyToValue = {};
    if( ctx.RevisionRuleAdmin[ status ] === _anyStatus ) {
        clauseToBeUpdated.revRuleEntryKeyToValue.status_type = _anyStatus;
    } else if( ctx.RevisionRuleAdmin[ status ] ) {
        clauseToBeUpdated.revRuleEntryKeyToValue.status_type = ctx.RevisionRuleAdmin[ status ].uid;
    }

    if( ctx.RevisionRuleAdmin[ statusConfig ] ) {
        clauseToBeUpdated.revRuleEntryKeyToValue.config_type = ctx.RevisionRuleAdmin[ statusConfig ].configType;
    }

    if( !isForAddClause ) {
        if ( clauseToBeUpdated.displayText !== displayText ) {
        modifyClauseProperty( data, clauseToBeUpdated, displayText );
        }
    } else {
        createClausePropertyForAddClause( clauseToBeUpdated, displayText );
    }
};

/**
 * Get updated Working clause
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clauseToBeUpdated - modified/added clause
 * @param {Boolean} isForAddClause - true if clause is added from AddClause panel
 *
 */
export let getUpdatedWorkingClause = function( data, clauseToBeUpdated, isForAddClause ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var current_user = undefined;
    var current_group = undefined;
    var user = undefined;
    var group = undefined;
    var user_type = _user;
    var group_type = _group;

    if( clauseToBeUpdated.entryType === 0 ) {
        if( isForAddClause ) {
            user_type = ADDCLAUSE_PREFIX + _user;
            group_type = ADDCLAUSE_PREFIX + _group;
        }
        if( ctx.RevisionRuleAdmin[ user_type ] && ctx.user ) {
            current_user = ctx.RevisionRuleAdmin[ user_type ].uid === ctx.user.uid;
        }
        if( ctx.RevisionRuleAdmin[ group_type ] && ctx.userSession ) {
            current_group = ctx.RevisionRuleAdmin[ group_type ].uid === ctx.userSession.props.group.dbValue;
        }
        clauseToBeUpdated.revRuleEntryKeyToValue = {};
        var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, isForAddClause );
        if( !current_user && ctx.RevisionRuleAdmin[ user_type ] ) {
            user = ctx.RevisionRuleAdmin[ user_type ].uid;
            clauseToBeUpdated.revRuleEntryKeyToValue.user = user;
        }
        if( !current_group && ctx.RevisionRuleAdmin[ group_type ] ) {
            group = ctx.RevisionRuleAdmin[ group_type ].uid;
            clauseToBeUpdated.revRuleEntryKeyToValue.group = group;
        }

        if( current_user ) {
            clauseToBeUpdated.revRuleEntryKeyToValue.current_user = 'true';
        }

        if( current_group ) {
            clauseToBeUpdated.revRuleEntryKeyToValue.current_group = 'true';
        }

        if( !isForAddClause ) {
            modifyClauseProperty( data, clauseToBeUpdated, displayText );
        } else {
            createClausePropertyForAddClause( clauseToBeUpdated, displayText );
        }
    }
};

/**
 * Get updated Release Event clause
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clauseToBeUpdated - modified/added clause
 * @param {Boolean} isForAddClause - true if clause is added from AddClause panel
 *
 */
export let getUpdatedReleaseEventClause = function( data, clauseToBeUpdated, isForAddClause ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var release_event = undefined;
    var event_type = _release_event;

    if( clauseToBeUpdated.entryType === 13 ) {
        if( isForAddClause ) {
            event_type = ADDCLAUSE_PREFIX + _release_event;
        }

        clauseToBeUpdated.revRuleEntryKeyToValue = {};
        var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, isForAddClause );
        if( ctx.RevisionRuleAdmin[ event_type ] ) {
            release_event = ctx.RevisionRuleAdmin[ event_type ].uid;
            clauseToBeUpdated.revRuleEntryKeyToValue.release_event = release_event;
        }

        if( !isForAddClause ) {
            modifyClauseProperty( data, clauseToBeUpdated, displayText );
        } else {
            createClausePropertyForAddClause( clauseToBeUpdated, displayText );
        }
    }
};

/**
 * Get updated End Item clause
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clauseToBeUpdated - modified/added clause
 * @param {Boolean} isForAddClause - true if clause is added from AddClause panel
 *
 */
export let getUpdatedEndItemClause = function( data, clauseToBeUpdated, isForAddClause ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var endItem_type = 'end_item';
    if( isForAddClause ) {
        endItem_type = ADDCLAUSE_PREFIX + endItem_type;
    }
    var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, isForAddClause );
    if( ctx.RevisionRuleAdmin[ endItem_type ] ) {
        clauseToBeUpdated.revRuleEntryKeyToValue = {
            end_item: ctx.RevisionRuleAdmin[ endItem_type ].uid
        };
    } else if( clauseToBeUpdated.revRuleEntryKeyToValue ) {
        clauseToBeUpdated.revRuleEntryKeyToValue = undefined;
    }
    if( !isForAddClause ) {
        modifyClauseProperty( data, clauseToBeUpdated, displayText );
    } else {
        createClausePropertyForAddClause( clauseToBeUpdated, displayText );
    }
};

/**
 * Get updated Override clause
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clauseToBeUpdated - modified/added clause
 * @param {Boolean} isForAddClause - true if clause is added from AddClause panel
 *
 */
export let getUpdatedOverrideClause = function( data, clauseToBeUpdated, isForAddClause ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var folder_type = 'folder';
    if( isForAddClause ) {
        folder_type = ADDCLAUSE_PREFIX + folder_type;
    }
    var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, isForAddClause );
    if( ctx.RevisionRuleAdmin[ folder_type ] ) {
        clauseToBeUpdated.revRuleEntryKeyToValue = {
            folder: ctx.RevisionRuleAdmin[ folder_type ].uid
        };
    } else if( clauseToBeUpdated.revRuleEntryKeyToValue ) {
        clauseToBeUpdated.revRuleEntryKeyToValue = undefined;
    }
    if( !isForAddClause && displayText !== clauseToBeUpdated.displayText ) {
        modifyClauseProperty( data, clauseToBeUpdated, displayText );
    } else {
        createClausePropertyForAddClause( clauseToBeUpdated, displayText );
    }
};

//Unit clause
export let updateUnitClauseText = function( data ) {
    if( canUpdateClauseProperty( data ) ) {
        var clauseToBeUpdated = getSelectedClause( data );
        if( clauseToBeUpdated && clauseToBeUpdated.entryType === 4 ) {
            if( !data.unit_no.error ) {
                var unitNum = data.unit_no.dbValue.toString();
                if( clauseToBeUpdated.revRuleEntryKeyToValue.unit_no !== unitNum ) {
                    var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, false );
                    clauseToBeUpdated.revRuleEntryKeyToValue.unit_no = unitNum;
                    modifyClauseProperty( data, clauseToBeUpdated, displayText );
                }
            }
        }
    }
};

//Date clause
export let updateDateClauseText = function( data ) {
    if( canUpdateClauseProperty( data ) ) {
        var clauseToBeUpdated = getSelectedClause( data );
        if( clauseToBeUpdated && clauseToBeUpdated.entryType === 3 ) {
            var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, false );
            var dateString = displayText.substring( displayText.indexOf( '(' ) + 1, displayText.indexOf( ')' ) ).trim();
            if ( data.date.error ) {
                clauseToBeUpdated.revRuleEntryKeyToValue.date = '';
                modifyClauseProperty( data, clauseToBeUpdated, displayText );
            }

            if( clauseToBeUpdated.revRuleEntryKeyToValue.date !== dateString && !data.date.error && dateString !== 'Today' ) {
                clauseToBeUpdated.revRuleEntryKeyToValue.date = dateString;
                modifyClauseProperty( data, clauseToBeUpdated, displayText );
            }
            if( !( clauseToBeUpdated.revRuleEntryKeyToValue.today === undefined && !data.today.dbValue ) && clauseToBeUpdated.revRuleEntryKeyToValue.today !== data.today.dbValue.toString() ) {
                clauseToBeUpdated.revRuleEntryKeyToValue.today = data.today.dbValue.toString();
                if( !data.today.dbValue && data.date.dateApi.dateValue === undefined ) {
                    data.date.dateApi.dateValue = '';
                }
                modifyClauseProperty( data, clauseToBeUpdated, displayText );
            }
        }
    }
};

//Latest clause
export let updateLatestClauseText = function( data ) {
    var clauseToBeUpdated = getSelectedClause( data );

    var latestConfigType = data.latestConfigType;
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature === true ) {
        latestConfigType = data.latestConfigTypeForRevOcc;
    }

    if( clauseToBeUpdated && clauseToBeUpdated.entryType === 7 ) {
        var latestConfigTypeCopy = {
            configType: latestConfigType.dbValue,
            configDisplay: latestConfigType.uiValue
        };
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'latestConfigType', latestConfigTypeCopy );
        var selectedVal = latestConfigType.dbValue.toString();
        var displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, clauseToBeUpdated.entryType, false );
        clauseToBeUpdated.revRuleEntryKeyToValue.latest = selectedVal;

        if ( clauseToBeUpdated.displayText !== displayText ) {
        modifyClauseProperty( data, clauseToBeUpdated, displayText );
        }
    }
};

//Override clause
export let updateOverrideClauseText = function( data ) {
    var clauseToBeUpdated = getSelectedClause( data );
    if( clauseToBeUpdated && clauseToBeUpdated.entryType === 2 ) {
        exports.getUpdatedOverrideClause( data, clauseToBeUpdated, false );
    }
};

//End Item clause
export let updateEndItemClauseText = function( data ) {
    var clauseToBeUpdated = getSelectedClause( data );
    if( clauseToBeUpdated && clauseToBeUpdated.entryType === 8 ) {
        exports.getUpdatedEndItemClause( data, clauseToBeUpdated, false );
    }
};

/**
 * Update event clause text
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 *
 */
export let updateReleaseEventClauseText = function( data ) {
    var clauseToBeUpdated = getSelectedClause( data );
    if( clauseToBeUpdated && clauseToBeUpdated.entryType === 13 ) {
        exports.getUpdatedReleaseEventClause( data, clauseToBeUpdated, false );
    }
};

/**
 * remove the selected Clause Property
 *
 * @param {Object} currentlySelectedClause - currently selected clause
 * @param {Object} dataProvider - data provider for displaying the clauses
 *
 */
export let removeClauseProperty = function( currentlySelectedClause, dataProvider, isForAddClause ) {
    var folder_type = 'folder';
    var endItem_type = 'end_item';
    var branch_type = 'branch';
    var releaseEvent_type = 'release_event';
    var currentlySelectedClauseProperty = 'currentlySelectedClauseProperty';
    if( isForAddClause ) {
        folder_type = ADDCLAUSE_PREFIX + folder_type;
        endItem_type = ADDCLAUSE_PREFIX + endItem_type;
        branch_type = ADDCLAUSE_PREFIX + branch_type;
        releaseEvent_type = ADDCLAUSE_PREFIX + releaseEvent_type;
        currentlySelectedClauseProperty = ADDCLAUSE_PREFIX + currentlySelectedClauseProperty;
    }
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( currentlySelectedClauseProperty, undefined );
    switch ( currentlySelectedClause.dbValue ) {
        case 2:
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( folder_type, undefined );
            if( !isForAddClause ) {
                eventBus.publish( 'RevisionRuleAdminPanel.updateOverrideClauseText' );
            }
            break;
        case 8:
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( endItem_type, undefined );
            if( !isForAddClause ) {
                eventBus.publish( 'RevisionRuleAdminPanel.updateEndItemClauseText' );
            }
            break;
        case 13:
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( releaseEvent_type, undefined );
            if( !isForAddClause ) {
                eventBus.publish( 'RevisionRuleAdminPanel.updateReleaseEventClauseText' );
            }
            break;
        case 10:
            var selectedIndex = dataProvider.getSelectedIndexes()[ 0 ];
            var clauses = dataProvider.viewModelCollection.getLoadedViewModelObjects();
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( branch_type, undefined );
            clauses[ selectedIndex ].revRuleEntryKeyToValue = undefined;
            break;
        default:
            break;
    }
};

/**
 *  update configuration typr for status clause
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let updateStatusConfigType = function( data, isUpdatedFromWidget ) {
    if( !isUpdatedFromWidget || data.eventData && data.eventData.lovValue && data.statusConfigType.dbValue === data.eventData.lovValue.propInternalValue ) {
        var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
        var isSelectedFromAddPanel = undefined;
        if( subPanelContext ) {
            isSelectedFromAddPanel = subPanelContext.activeView && subPanelContext.activeView === 'AddClauses';
        }
        var statusconfig_type = getClausePropertiesType( 'statusConfigType', data );
        var statusConfig = {
            configType: data.statusConfigType.dbValue,
            configDisplay: data.statusConfigType.uiValue
        };
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( statusconfig_type, statusConfig );
        if( !isSelectedFromAddPanel ) {
            updateStatusClauseText( subPanelContext );
        }
    }
};

/**
 * Update the user property for working clause with the selected property from the widget
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let usersListSelectionChanged = function( data ) {
    var isClausePropertyCheckbox = data.eventData.condition === 'conditions.isCurrentUserChanged';
    var islovValueModified = false;
    if( !isClausePropertyCheckbox && data.eventData.lovValue ) {
        islovValueModified = data.eventData.lovValue.propInternalValue === data.user.dbValue;
    }
    if( isClausePropertyCheckbox || islovValueModified ) {
        var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
        if( subPanelContext ) {
            var isSelectedFromAddPanel = subPanelContext.activeView && subPanelContext.activeView === 'AddClauses';
        }
        var object = {};
        var user_type = getClausePropertiesType( _user, data );
        if( data.user.dbValue !== '' ) {
            object = cdmSvc.getObject( data.user.dbValue );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( user_type, undefined );
        }
        if( object.uid ) {
            var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( object, 'EDIT' );
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( user_type, vmo );
        }
        if( !isSelectedFromAddPanel ) {
            updateWorkingClauseText( subPanelContext );
        }
    }
};

/**
 * Update the release event property with the selected property from the widget
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let eventListSelectionChanged = function( data ) {
    var islovValueModified = false;
    if( data.eventData.lovValue ) {
        islovValueModified = data.eventData.lovValue.propInternalValue === data.release_event.dbValue;
    }
    if( islovValueModified ) {
        var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
        if( subPanelContext ) {
            var isSelectedFromAddPanel = subPanelContext.activeView && subPanelContext.activeView === 'AddClauses';
        }
        var object = {};

        var release_event_type = getClausePropertiesType( _release_event, data );
        if( data.release_event.dbValue !== '' ) {
            object = cdmSvc.getObject( data.release_event.dbValue );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( release_event_type, undefined );
        }
        if( object.uid ) {
            var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( object, 'EDIT' );
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( release_event_type, vmo );
        }
        if( !isSelectedFromAddPanel ) {
            updateReleaseEventClauseText( subPanelContext );
        }
    }
};

/**
 * Update the group property for working clause with the selected property from the widget
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let groupsListSelectionChanged = function( data ) {
    var isClausePropertyCheckbox = data.eventData.condition === 'conditions.isCurrentGroupChanged';
    var islovValueModified = false;
    if( !isClausePropertyCheckbox && data.eventData.lovValue ) {
        islovValueModified = data.eventData.lovValue.propInternalValue === data.group.dbValue;
    }
    if( isClausePropertyCheckbox || islovValueModified ) {
        var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
        if( subPanelContext ) {
            var isSelectedFromAddPanel = subPanelContext.activeView && subPanelContext.activeView === 'AddClauses';
        }
        var object = {};
        var group_type = getClausePropertiesType( _group, data );
        if( data.group.dbValue !== '' ) {
            object = cdmSvc.getObject( data.group.dbValue );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( group_type, undefined );
        }
        if( object.uid ) {
            var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( object, 'EDIT' );
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( group_type, vmo );
        }
        if( !isSelectedFromAddPanel ) {
            updateWorkingClauseText( subPanelContext );
        }
    }
};

/**
 * Update the status property for status clause with the selected property from the widget
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let statusListSelectionChanged = function( data ) {
    var islovValueModified = false;
    islovValueModified = data.eventData.lovValue && data.eventData.lovValue.propInternalValue === data.status.dbValue;
    if( islovValueModified ) {
        var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
        if( subPanelContext ) {
            var isSelectedFromAddPanel = subPanelContext.activeView && subPanelContext.activeView === 'AddClauses';
        }
        var object = {};
        var status_type = getClausePropertiesType( 'status', data );
        if( data.status.dbValue !== _anyStatus ) {
            object = cdmSvc.getObject( data.status.dbValue );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( status_type, _anyStatus );
        }
        if( object.uid ) {
            var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( object, 'EDIT' );
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( status_type, vmo );
        }
        if( !isSelectedFromAddPanel ) {
            updateStatusClauseText( subPanelContext );
        }
    }
};

/**
 * Get the search string value for SOA input to fetch the clause property values
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clausePropertyName - Name of the clause property
 * @return {String} searchString - Search string for SOA input to fetch the clause property values
 *
 */
export let getSearchStringValue = function( data, clausePropertyName ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var searchString = '';

    switch ( clausePropertyName ) {
        case _user:
            var user_type = getClausePropertiesType( _user, data );
            if( data.user.uiValue && !( ctx.RevisionRuleAdmin[ user_type ] && data.user.uiValue === ctx.RevisionRuleAdmin[ user_type ].props.object_string.dbValue ) ) {
                /*set the searchString to '' to fetch all clause properties value in case of widget initialisation
                (widget textbox will have existing clause property value and with that as searchString value SOA will only return one property and user has to manually search with empty value)*/
                searchString = data.user.uiValue;
            }
            break;
        case _group:
            var group_type = getClausePropertiesType( _group, data );
            if( data.group.uiValue && !( ctx.RevisionRuleAdmin[ group_type ] && data.group.uiValue === ctx.RevisionRuleAdmin[ group_type ].props.object_string.dbValue ) ) {
                /*set the searchString to '' to fetch all clause properties value in case of widget initialisation
                (widget textbox will have existing clause property value and with that as searchString value SOA will only return one property and user has to manually search with empty value)*/
                searchString = data.group.uiValue;
            }
            break;
        case _status:
            var status_type = getClausePropertiesType( 'status', data );
            /*set the searchString to '' to fetch all clause properties value in case of widget initialisation
            (widget textbox will have existing clause property value and with that as searchString value SOA will only return one property and user has to manually search with empty value)*/
            if( data.status.uiValue && data.status.uiValue !== 'Any' && ctx.RevisionRuleAdmin[ status_type ] ) {
                if( ctx.RevisionRuleAdmin[ status_type ] === 'Any' && data.status.uiValue !== 'Any' || ctx.RevisionRuleAdmin[ status_type ].props && data.status.uiValue !== ctx.RevisionRuleAdmin[ status_type ].props.object_string.dbValue ) {
                    searchString = data.status.uiValue;
                }
            }
            break;
        default:
            break;
    }
    return searchString;
};

/**
 * Get the search string value for SOA input to fetch the release event clause property values
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @return {String} searchString - Search string for SOA input to fetch the clause property values
 *
 */
export let getSearchStringValueForEvent = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var searchString = '';

    var release_event_type = getClausePropertiesType( _release_event, data );
    if( data.release_event.uiValue && ctx.RevisionRuleAdmin[ release_event_type ] ) {
        if( ctx.RevisionRuleAdmin[ release_event_type ] === data.releaseEventsList[0].uiValue || ctx.RevisionRuleAdmin[ release_event_type ].props &&
            data.release_event.uiValue !== ctx.RevisionRuleAdmin[ release_event_type ].props.object_string.dbValue ) {
            searchString = data.release_event.uiValue;
        }
    }
    return searchString;
};

/**
 * Process SOA response and add the values to the widget dataprovider
 *
 * @param {Object} response - findObjectsByClassAndAttributes2/performSearch SOA response
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clausePropertyName - Name of the clause property
 * @return {StringArray} response value for dataprovider
 *
 */

export let processSearchResults = function( response, data, clausePropertyName ) {
    var value = [];
    var result = undefined;
    if( clausePropertyName === _status && response.result ) {
        result = response.result;
        //First value for 'Status' widget will be 'Any'
        var resource = 'RevisionRuleAdminConstants';
        var localeTextBundle = localeSvc.getLoadedText( resource );
        var anyStatus = localeTextBundle.any;
        var property = {
            propDisplayValue: anyStatus,
            propInternalValue: anyStatus,
            uid: anyStatus
        };
        value.push( property );
        data.moreValuesExist = data.dataProviders.statusListProvider.startIndex + response.totalLoaded < response.totalFound; // for pagination
    } else if( clausePropertyName === _user || clausePropertyName === _group ) {
        if( response.searchResults ) {
            result = response.searchResults;
            if( clausePropertyName === _user ) {
                data.moreValuesExist = data.dataProviders.usersListProvider.startIndex + response.totalLoaded < response.totalFound; // for pagination
            } else {
                data.moreValuesExist = data.dataProviders.groupsListProvider.startIndex + response.totalLoaded < response.totalFound; // for pagination
            }
        }
    }

    if( result ) {
        for( var ii = 0; ii < result.length; ii++ ) {
            property = {
                propDisplayValue: result[ ii ].props.object_string.uiValues[ 0 ],
                propInternalValue: result[ ii ].uid,
                uid: result[ ii ].uid
            };
            value.push( property );
        }
    }

    return value;
};

/**
 * Process SOA response and add the release events to the widget dataprovider
 *
 * @param {Object} response - performSearch SOA response
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @return {StringArray} response value for dataprovider
 *
 */

export let processReleaseEventSearchResults = function( response, data ) {
    var value = [];
    var result;
    data.moreValuesExist = false;

    if( response.searchResults ) {
        result = response.searchResults;
        data.moreValuesExist = data.dataProviders.eventsListProvider.startIndex + response.totalLoaded < response.totalFound; // for pagination
    }

    var property = {
        propDisplayValue: '',
        propInternalValue: '',
        uid: ''
    };

    if( result ) {
        for( var ii = 0; ii < result.length; ii++ ) {
           property = {
                propDisplayValue: result[ ii ].props.fnd0Name.uiValues[ 0 ],
                propInternalValue: result[ ii ].uid,
                uid: result[ ii ].uid
            };
            value.push( property );
        }
    }
    if( result && data.release_event.uiValue === '' ) {
        data.release_event.dbValue = value[0].propInternalValue;
        data.release_event.uiValue = value[0].propDisplayValue;

        var release_event_type = getClausePropertiesType( _release_event, data );
        let object = cdmSvc.getObject( data.release_event.dbValue );
        let vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( object, 'EDIT' );
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( release_event_type, vmo );
    }


    return value;
};

/**
 * Validate the input to the user widget value
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let validateUserWidgetValue = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var user_type = getClausePropertiesType( _user, data );
    data.validUser = true;
    data.messageForUserEntry = '';
    //user will be valid if either the widget inputText is equal to the user value in ctx
    // or widget inputText is present in the dataprovider
    var indexOfUser = -1;
    if( data.dataProviders.usersListProvider.viewModelCollection.loadedVMObjects.length > 0 && data.user.uiValue !== '' ) {
        indexOfUser = data.dataProviders.usersListProvider.viewModelCollection.loadedVMObjects
            .map( function( x ) {
                return x.uid;
            } ).indexOf( data.user.dbValue );
    }
    if( indexOfUser < 0 && !( data.user.uiValue === '' || ctx.RevisionRuleAdmin[ user_type ] && data.user.uiValue === ctx.RevisionRuleAdmin[ user_type ].props.object_string.dbValue ) ) {
        data.validUser = false;
        if( ctx.RevisionRuleAdmin[ user_type ] ) {
            data.user.dbValue = ctx.RevisionRuleAdmin[ user_type ].uid;
            data.user.uiValue = ctx.RevisionRuleAdmin[ user_type ].props.object_string.dbValue;
        } else {
            data.user.dbValue = '';
            data.user.uiValue = '';
        }
    }
};

/**
 * Validate the input to the event widget value
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let validateEventWidgetValue = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var release_event_type = getClausePropertiesType( _release_event, data );
    data.validEvent = true;
    data.messageForEventEntry = '';
    //release event will be valid if either the widget inputText is equal to the release event value in ctx
    // or widget inputText is present in the dataprovider
    var indexOfEvent = -1;
    if( data.dataProviders.eventsListProvider.viewModelCollection.loadedVMObjects.length > 0 && data.release_event.uiValue !== '' ) {
        indexOfEvent = data.dataProviders.eventsListProvider.viewModelCollection.loadedVMObjects
            .map( function( x ) {
                return x.uid;
            } ).indexOf( data.release_event.dbValue );
    }
    if( indexOfEvent < 0 && !( data.release_event.uiValue === '' || ctx.RevisionRuleAdmin[ release_event_type ] && data.release_event.uiValue === ctx.RevisionRuleAdmin[ release_event_type ].props.fnd0Name.dbValue ) ) {
        data.validEvent = false;
        if( ctx.RevisionRuleAdmin[ release_event_type ] ) {
            data.release_event.dbValue = ctx.RevisionRuleAdmin[ release_event_type ].uid;
            data.release_event.uiValue = ctx.RevisionRuleAdmin[ release_event_type ].props.fnd0Name.dbValue;
        } else {
            data.release_event.dbValue = '';
            data.release_event.uiValue = '';
        }
    }
};

/**
 * Validate the input to the group widget value
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let validateGroupWidgetValue = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    data.validGroup = true;
    data.messageForGroupEntry = '';
    var group_type = getClausePropertiesType( _group, data );

    var indexOfGroup = -1;
    if( data.dataProviders.groupsListProvider.viewModelCollection.loadedVMObjects.length > 0 && data.group.uiValue !== '' ) {
        indexOfGroup = data.dataProviders.groupsListProvider.viewModelCollection.loadedVMObjects
            .map( function( x ) {
                return x.uid;
            } ).indexOf( data.group.dbValue );
    }
    //group will be valid if either the widget inputText is equal to the user value in ctx
    // or widget inputText is present in the dataprovider
    if( indexOfGroup < 0 && !( data.group.uiValue === '' || ctx.RevisionRuleAdmin[ group_type ] && data.group.uiValue === ctx.RevisionRuleAdmin[ group_type ].props.object_string.dbValue ) ) {
        data.validGroup = false;
        if( ctx.RevisionRuleAdmin[ group_type ] ) {
            data.group.dbValue = ctx.RevisionRuleAdmin[ group_type ].uid;
            data.group.uiValue = ctx.RevisionRuleAdmin[ group_type ].props.object_string.dbValue;
        } else {
            data.group.dbValue = '';
            data.group.uiValue = '';
        }
    }
};

/**
 * Validate the input to the status widget value
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let validateStatusWidgetValue = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    var status_type = getClausePropertiesType( 'status', data );
    data.validStatus = true;
    data.messageForStatusEntry = '';
    var status = data.status.uiValue;
    //status will be valid if either the widget inputText is equal to the user value in ctx
    // or widget inputText is present in the dataprovider

    var indexOfStatus = -1;
    if( data.dataProviders.statusListProvider.viewModelCollection.loadedVMObjects.length > 0 && status !== _anyStatus ) {
        indexOfStatus = data.dataProviders.statusListProvider.viewModelCollection.loadedVMObjects
            .map( function( x ) {
                return x.uid;
            } ).indexOf( data.status.dbValue );
    }
    if( indexOfStatus < 0 ) {
        if( !( status === _anyStatus || ctx.RevisionRuleAdmin[ status_type ] &&
                ctx.RevisionRuleAdmin[ status_type ].props && status === ctx.RevisionRuleAdmin[ status_type ].props.object_string.dbValue ) ) {
            data.validStatus = false;
            if( ctx.RevisionRuleAdmin[ status_type ] === _anyStatus ) {
                data.status.dbValue = _anyStatus;
                data.status.uiValue = _anyStatus;
            } else {
                data.status.dbValue = ctx.RevisionRuleAdmin[ status_type ].uid;
                data.status.uiValue = ctx.RevisionRuleAdmin[ status_type ].props.object_string.dbValue;
            }
        }
    }
    if( data.status.dbValue === _anyStatus ) {
        var resource = 'RevisionRuleAdminConstants';
        var localeTextBundle = localeSvc.getLoadedText( resource );
        if( data.statusConfigType.dbValue !== '0' ) {
            data.statusConfigType.dbValue = '0';
            data.statusConfigType.uiValue = localeTextBundle.releasedDate;
            exports.updateStatusConfigType( data, false );
        }
    }
};

/**
 * Update widget selected element in case current_user/current_group checkbox value is changed
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} clausePropertyName - Name of the clause property
 *
 */
export let updateWidgetTextForClauseProperty = function( data, clausePropertyName ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    switch ( clausePropertyName ) {
        case _user:
            //if current_user checkbox is checked then update the widget selected element with the current user value
            //else reset the selected element to empty value
            if( data.currentUser && data.user ) {
                if( data.currentUser.dbValue && data.user.dbValue !== ctx.user.uid ) {
                    data.user.uiValue = ctx.user.props.object_string.dbValues[ 0 ];
                    data.user.dbValue = ctx.user.uid;
                    exports.usersListSelectionChanged( data );
                } else if( !data.currentUser.dbValue && data.user.dbValue === ctx.user.uid ) {
                    data.user.uiValue = '';
                    data.user.dbValue = '';
                    exports.usersListSelectionChanged( data );
                }
            }
            break;
        case _group:
            //if current_group checkbox is checked then update the widget selected element with the current group value
            //else reset the selected element to empty value
            if( data.currentGroup && data.group ) {
                if( data.currentGroup.dbValue && data.group.dbValue !== ctx.userSession.props.group.dbValue ) {
                    data.group.uiValue = ctx.userSession.props.group.uiValue;
                    data.group.dbValue = ctx.userSession.props.group.dbValue;
                    exports.groupsListSelectionChanged( data );
                } else if( !data.currentGroup.dbValue && data.group.dbValue === ctx.userSession.props.group.dbValue ) {
                    data.group.uiValue = '';
                    data.group.dbValue = '';
                    exports.groupsListSelectionChanged( data );
                }
            }
            break;
        case _release_event:
            if( data.currentEvent && data.release_event ) {
                data.release_event.uiValue = '';
                data.release_event.dbValue = '';
                exports.eventListSelectionChanged( data );
            }
            break;
        default:
            break;
    }
};

/**
 * Initialize the clause property when any clause is selected from the list of clauses
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let clausePropertyValueInitialized = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.RevisionRuleAdmin.User ) {
        data.user.uiValue = ctx.RevisionRuleAdmin.User.props.object_string.dbValue;
        data.user.dbValue = ctx.RevisionRuleAdmin.User.uid;
        data.currentUser.dbValue = ctx.RevisionRuleAdmin.User.uid === ctx.user.uid;
    } else {
        data.user.uiValue = '';
        data.user.dbValue = '';
        data.currentUser.dbValue = false;
    }
    if( ctx.RevisionRuleAdmin.Group ) {
        data.group.uiValue = ctx.RevisionRuleAdmin.Group.props.object_string.dbValue;
        data.group.dbValue = ctx.RevisionRuleAdmin.Group.uid;
        data.currentGroup.dbValue = ctx.RevisionRuleAdmin.Group.uid === ctx.userSession.props.group.dbValue;
    } else {
        data.group.uiValue = '';
        data.group.dbValue = '';
        data.currentGroup.dbValue = false;
    }
    if( ctx.RevisionRuleAdmin.statusConfigType ) {
        data.statusConfigType.dbValue = ctx.RevisionRuleAdmin.statusConfigType.configType;
        data.statusConfigType.uiValue = ctx.RevisionRuleAdmin.statusConfigType.configDisplay;
    }
    if( ctx.RevisionRuleAdmin.status === _anyStatus ) {
        data.status.uiValue = _anyStatus;
        data.status.dbValue = _anyStatus;
    } else if( ctx.RevisionRuleAdmin.status ) {
        data.status.uiValue = ctx.RevisionRuleAdmin.status.props.object_string.dbValue;
        data.status.dbValue = ctx.RevisionRuleAdmin.status.uid;
    } else {
        data.status.uiValue = '';
        data.status.dbValue = '';
    }
};

/**
 * Initialize the event clause property when any clause is selected from the list of clauses
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let eventClausePropertyValueInitialized = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.RevisionRuleAdmin.Fnd0ReleaseEvent ) {
        data.release_event.uiValue = ctx.RevisionRuleAdmin.Fnd0ReleaseEvent.props.fnd0Name.dbValue;
        data.release_event.dbValue = ctx.RevisionRuleAdmin.Fnd0ReleaseEvent.uid;
    } else {
        data.release_event.uiValue = '';
        data.release_event.dbValue = '';
        data.currentEvent.dbValue = false;
    }
};

/**
 * Initialize the clause property when RevisionRuleAdminClauseProperties panel content is loaded
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let initilialiseClauseProperties = function( data ) {
    var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
    if( subPanelContext && subPanelContext.activeView && subPanelContext.activeView === 'RevisionRuleAdminPanel' ) {
        exports.clausePropertyValueInitialized( data );
    }
};

/**
 * Initialize the event clause property when RevisionRuleAdminClauseProperties panel content is loaded
 *
 * @param {DeclViewModel} data - RevisionRuleAdminClausePropertiesViewModel
 *
 */
export let initilialiseEventClauseProperties = function( data ) {
    var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
    if( subPanelContext && subPanelContext.activeView && subPanelContext.activeView === 'RevisionRuleAdminPanel' ) {
        exports.eventClausePropertyValueInitialized( data );
    }
};

/**
 * Reset AddClause panel clause properties added in context and reselect the clause in the RevisionRule panel, when AddClause panel is closed
 *
 * @param {Object} dataProvider - dataprovider showing the list of clauses
 *
 */
export let resetAddClauseData = function( dataProvider ) {
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_User', undefined );
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_Group', undefined );
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_status', undefined );
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_statusConfigType', undefined );
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_end_item', undefined );
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_ReleaseEvent', undefined );
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_folder', undefined );
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_currentlySelectedClauseProperty', undefined );
    var selectedObjects = dataProvider.getSelectedObjects();
    var eventData = {
        selectedObjects: selectedObjects
    };
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'isAddClausesPanelLoaded', false );
    eventBus.publish( 'getRevisionRuleInfoProvider.selectionChangeEvent', eventData );
};

export default exports = {
    launchClauseUpdatePropertyPanel,
    processSoaResponseForBOTypes,
    getSearchCriteria,
    updateClausePropertyAndNavigateToInformationPanel,
    setClausePropertyAndNavigateToInformationPanel,
    updateClauseProperties,
    getUpdatedStatusClause,
    getUpdatedWorkingClause,
    getUpdatedEndItemClause,
    getUpdatedOverrideClause,
    updateUnitClauseText,
    updateDateClauseText,
    updateLatestClauseText,
    updateOverrideClauseText,
    updateEndItemClauseText,
    removeClauseProperty,
    updateStatusConfigType,
    usersListSelectionChanged,
    groupsListSelectionChanged,
    statusListSelectionChanged,
    getSearchStringValue,
    processSearchResults,
    validateUserWidgetValue,
    validateGroupWidgetValue,
    validateStatusWidgetValue,
    updateWidgetTextForClauseProperty,
    clausePropertyValueInitialized,
    initilialiseClauseProperties,
    getUpdatedReleaseEventClause,
    eventClausePropertyValueInitialized,
    initilialiseEventClauseProperties,
    processReleaseEventSearchResults,
    eventListSelectionChanged,
    getSearchStringValueForEvent,
    validateEventWidgetValue,
    updateReleaseEventClauseText,
    resetAddClauseData
};
/**
 * @memberof NgServices
 * @member acerevisionRuleAdminPanelService
 */
app.factory( 'addRevRuleClausePropertyService', () => exports );
