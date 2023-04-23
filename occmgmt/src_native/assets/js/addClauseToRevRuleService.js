//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/addClauseToRevRuleService
 */
import app from 'app';
import localeSvc from 'js/localeService';
import revisionRuleAdminCtx from 'js/revisionRuleAdminContextService';
import revRuleClauseDisplayTextService from 'js/revRuleClauseDisplayTextService';
import addRevRuleClausePropertyService from 'js/addRevRuleClausePropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import occmgmtUtils from 'js/occmgmtUtils';

var _localeTextBundle = null;

/**
 * update latest clause property when its updated from widget1
 *
 * @param {Object} data - data to generate clause
 * @returns {bool} data -false
 *
 */
function generateClauseToAdd( data ) {
    var newClause;
    var revRuleEntryKeyToValue = {};
    var displayText;
    var entryType = data.currentlySelectedClause.dbValue;
    switch ( entryType ) {
        case 0: // working
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedWorkingClause( data, newClause, true );
            break;
        case 1: //status
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedStatusClause( data, newClause, true );
            break;
        case 2: //override
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedOverrideClause( data, newClause, true );
            break;
        case 3: //date
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            if( !data.addClause_date.error ) {
                var dateString = displayText.substring( displayText.indexOf( '(' ) + 1, displayText.indexOf( ')' ) ).trim();
                if( dateString === 'Today' ) {
                    dateString = '';
                }
                revRuleEntryKeyToValue.date = dateString;
            }
            revRuleEntryKeyToValue.today = data.addClause_today.dbValue.toString();
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 4: //Unit
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            if( !data.addClause_unit_no.error ) {
                revRuleEntryKeyToValue.unit_no = data.addClause_unit_no.dbValue.toString();
            }
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 6: //Precise
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 7: //Latest
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            var ctx = revisionRuleAdminCtx.getCtx();
            revRuleEntryKeyToValue.latest = ctx.RevisionRuleAdmin.addClause_latestConfigType.configType.toString();
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 8: //End Item
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedEndItemClause( data, newClause, true );
            break;
        case 13: //Release Event
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedReleaseEventClause( data, newClause, true );
            break;
        default:
            break;
    }
    // to check if similar clause alredy exist
    if( newClause !== undefined && newClause.entryType !== undefined ) {
        var clauseCanBeAdded = true;
        if( newClause.entryType !== 3 && newClause.entryType !== 4 && newClause.entryType !== 8 && newClause.entryType !== 13 ) {
            clauseCanBeAdded = checkClauseAddition( newClause, data );
        }
        if( clauseCanBeAdded ) {
            newClause.modified = true;
        } else {
            newClause = undefined;
        }
    }
    return newClause;
}

function checkClauseAddition( newClause, data ) {
    var clauseCanBeAdded = true;
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    for( var inx = 0; inx < data.clauses.length; inx++ ) {
        var clauseFound = _.isEqual( data.clauses[ inx ].displayText, newClause.displayText );
        if( clauseFound ) {
            //if simlilar clause alredy exist then instead of adding new one , select back the existing one
            clauseCanBeAdded = false;
            dataProvider.selectionModel.setSelection( data.clauses[ inx ] );
            break;
        }
    }
    return clauseCanBeAdded;
}
/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * Update the selected clause for RevisableOccurrence structure only if "Latest" clause exist's in the currentlySelectedClause
 *
 * @param {DeclViewModel} data - AddClausesViewModel
 */

export let updateCurrentlySelectedClauseForRevOcc = function( data ) {
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature === true ) {
        var addDate = false;
        var addUnit = false;
        var addItem = false;
        var addReleaseEvent = false;
        var addLatest = false;

        data.clauses.forEach( function( clause ) {
            if( clause.entryType === 3 ) {
                addDate = true;
            } else if( clause.entryType === 4 ) {
                addUnit = true;
            } else if( clause.entryType === 7 ) {
                addLatest = true;
            } else if( clause.entryType === 8 ) {
                addItem = true;
            } else if( clause.entryType === 13 ) {
                addReleaseEvent = true;
            }
        } );
        if( addLatest ) {
            if( !addDate ) {
                data.currentlySelectedClause.dbValue = 3;
                data.currentlySelectedClause.uiValue = _localeTextBundle.date;
            } else if( !addUnit ) {
                data.currentlySelectedClause.dbValue = 4;
                data.currentlySelectedClause.uiValue = _localeTextBundle.unit_no;
            } else if( !addItem ) {
                data.currentlySelectedClause.dbValue = 8;
                data.currentlySelectedClause.uiValue = _localeTextBundle.endItemName;
            } else if( !addReleaseEvent ) {
                data.currentlySelectedClause.dbValue = 13;
                data.currentlySelectedClause.uiValue = _localeTextBundle.releaseEventName;
            }
        }
    }
};

/**
 * initialise AddClauses panel clause properties in the context and navigate to AddClauses panel
 *
 *
 */
export let launchAddClausePanel = function() {
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.RevisionRuleAdmin ) {
        ctx.RevisionRuleAdmin.addClause_status = 'Any';
        ctx.RevisionRuleAdmin.addClause_statusConfigType = {
            configType: '0',
            configDisplay: _localeTextBundle.releasedDate
        };
        ctx.RevisionRuleAdmin.addClause_latestConfigType = {
            configType: 0,
            configDisplay: _localeTextBundle.creationDate
        };
        ctx.RevisionRuleAdmin.isAddClausesPanelLoaded = true;
    }
    var eventData = {
        destPanelId: 'AddClauses',
        title: _localeTextBundle.addClausesPanelTitle,
        recreatePanel: true,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', eventData );
};

/**
 * update latest clause property when its updated from widget
 *
 * @param {Object} latestConfig - latestConfig widget property
 *
 */
export let upateLatestConfigForAddClauses = function( latestConfig ) {
    var latestConfigType = {
        configType: latestConfig.dbValue,
        configDisplay: latestConfig.uiValue
    };
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_latestConfigType', latestConfigType );
};

export let getClausesToAdd = function( data ) {
    var addDate = false;
    var addUnit = false;
    var addItem = false;
    var addReleaseEvent = false;
    var addWorking = false;
    var addStatus = false;
    var addLatest = false;
    data.clauses.forEach( function( clause ) {
        if( clause.entryType === 0 ) {
            addWorking = true;
        } else if( clause.entryType === 1 ) {
            addStatus = true;
        } else if( clause.entryType === 3 ) {
            addDate = true;
        } else if( clause.entryType === 4 ) {
            addUnit = true;
        } else if( clause.entryType === 7 ) {
            addLatest = true;
        } else if( clause.entryType === 8 ) {
            addItem = true;
        } else if( clause.entryType === 13 ) {
            addReleaseEvent = true;
        }
    } );

    var commonClausesToAdd = [ {
            propDisplayValue: _localeTextBundle.working,
            propInternalValue: 0
        },
        {
            propDisplayValue: _localeTextBundle.status,
            propInternalValue: 1
        },
        {
            propDisplayValue: _localeTextBundle.date,
            propInternalValue: 3
        },
        {
            propDisplayValue: _localeTextBundle.unit_no,
            propInternalValue: 4
        },
        {
            propDisplayValue: _localeTextBundle.latest,
            propInternalValue: 7
        },
        {
            propDisplayValue: _localeTextBundle.endItemName,
            propInternalValue: 8
        },
        {
            propDisplayValue: _localeTextBundle.releaseEventName,
            propInternalValue: 13
        }
    ];

    var specificClausesToAdd = [ {
            propDisplayValue: _localeTextBundle.override,
            propInternalValue: 2
        },
        {
            propDisplayValue: _localeTextBundle.precise,
            propInternalValue: 6
        }
    ];

    var clausesToAdd = [];
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature === true ) {
        clausesToAdd = commonClausesToAdd;
        if( addLatest ) {
            _.remove( clausesToAdd, function( clause ) {
                return clause.propInternalValue === 0 || clause.propInternalValue === 1 || clause.propInternalValue === 7;
            } );
        } else if( addWorking || addStatus ) {
            _.remove( clausesToAdd, function( clause ) {
                return clause.propInternalValue === 7;
            } );
        }
    } else {
        clausesToAdd = commonClausesToAdd.concat( specificClausesToAdd );
    }

    //Remove release event clause as it is only supported for Revisible Occurrence structures from Tc14.1 onwards.
    //Once release event clause is supported for Item structures, remove this code.
    if( ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature === undefined 
        || ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature === false 
        || !occmgmtUtils.isMinimumTCVersion( 14, 1 ) ) {
        _.remove( clausesToAdd, function( clause ) {
            return clause.propInternalValue === 13;
        } );
    }

    _.remove( clausesToAdd, function( clause ) {
        return clause.propInternalValue === 3 && addDate || clause.propInternalValue === 4 && addUnit ||
            clause.propInternalValue === 8 && addItem || clause.propInternalValue === 13 && addReleaseEvent;
    } );

    data.clausesToAdd = clausesToAdd;
};

export let addClauseToRevRule = function( data ) {
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    var newClause = generateClauseToAdd( data );
    //enable auto scroll because new clause will get added to bottom of the list which might not be visible
    var ctx = revisionRuleAdminCtx.getCtx();
    ctx.RevisionRuleAdmin.shouldEnableAutoScroll = true;

    if( newClause ) {
        data.clauses.push( newClause );
        dataProvider.update( data.clauses, data.clauses.length );
        dataProvider.selectionModel.setSelection( newClause );
        eventBus.publish( 'RevisionRuleAdminPanel.tagRevisionRuleAsModified' );
    }
};

_localeTextBundle = localeSvc.getLoadedText( app.getBaseUrlPath() + '/i18n/RevisionRuleAdminConstants' );

export default exports = {
    launchAddClausePanel,
    upateLatestConfigForAddClauses,
    getClausesToAdd,
    addClauseToRevRule,
    updateCurrentlySelectedClauseForRevOcc
};
/**
 * @memberof NgServices
 * @member acerevisionRuleAdminPanelService
 */
app.factory( 'addClauseToRevRuleService', () => exports );
