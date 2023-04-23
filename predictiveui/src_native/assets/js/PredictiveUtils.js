// Copyright (c) 2020 Siemens

/* global
 */

/**
 * Simple Alert service for sample command Handlers
 *
 * @module js/PredictiveUtils
 */

import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import cfgSvc from 'js/configurationService';
import appCtxService from 'js/appCtxService';
import commandConfigurationService from 'js/commandConfigurationService';
import localeSvc from 'js/localeService';
import navigationSvc from 'js/navigationService';
import soa_preferenceService from 'soa/preferenceService';
import browserUtils from 'js/browserUtils';
import AwHttpService from 'js/awHttpService';
import AwStateService from 'js/awStateService';
import clipboardService from 'js/clipboardService';
import viewModelObjectService from 'js/viewModelObjectService';
import tabRegistryService from 'js/tabRegistry.service';
import commandHighlightService from 'js/commandHighlightService';
import messageService from 'js/messagingService';

var microServiceURLPredictionService = 'tc/micro/cps/commandprediction/v2/commands';
var microServiceURLTrainingService = 'tc/micro/cps/commandprediction/history';
var microServiceURLLikeService = 'tc/micro/cps/commandprediction/commands/like';
var microServiceURLDisLikeService = 'tc/micro/cps/commandprediction/commands/dislike';

var exports = {};
var _appCtxService = appCtxService;
_appCtxService.ctx.PredictiveInfo = {};
_appCtxService.ctx.PredictiveInfo.analyticsInfo = {};
_appCtxService.ctx.PredictiveInfo.predictSublocationId = 's:showHome';
_appCtxService.ctx.PredictiveInfo.previousCommand = '';
_appCtxService.ctx.PredictiveInfo.currentCommand = 's:showHome';
_appCtxService.ctx.PredictiveInfo.nextSublocation = '';
_appCtxService.ctx.PredictiveInfo.boType = '';
_appCtxService.ctx.PredictiveInfo.selectionMode = 0;
_appCtxService.ctx.PredictiveInfo.commandValues = [];
_appCtxService.ctx.PredictiveInfo.newAnchor = 0;
_appCtxService.ctx.PredictiveInfo.analyticsInfo.commandGroup = null;
_appCtxService.ctx.PredictiveInfo.analyticsInfo.commandRank = null;
_appCtxService.ctx.PredictiveInfo.analyticsInfo.logInfo = null;
_appCtxService.ctx.PredictiveInfo.LikeDislikeInfo = {};

var expertMode = false;
var destroyPlacement = null;
var cellDestroyPlacement = null;
var logInfo = '';
let _enabled = true;
let _idleEventListener;
var ParameterInfo = {};
var previousNodeList = [];
var expertTimer = null;
/**
 * This array holds a list of command objects to be logged into the Command Prediction Training server.
 *
 * @type {Array}
 * @private
 */
let _logCommandsList = {
    commandData: []
};
let post = function( body, url, headers ) {
    if( isAWAEnabled() ) {
        var $http = AwHttpService.instance;
        return $http.post( browserUtils.getBaseURL() + url, body, {
            headers: headers
        } );
    }
};

export let expertModeEnabled = function( setexpertMode, data ) {
    expertMode = setexpertMode;
    if( expertMode === true ) {
        //Condition to enable tutor mode rubbon
        _appCtxService.ctx.showTutorRibbon = true;
        if( data.preferences.AWA_expert_notification_timeout !== undefined ) {
            data.expertTimeout = data.preferences.AWA_expert_notification_timeout[ 0 ];
        }
        expertTimer = setTimeout( function() {
            if( data.expertButton.dbValue === true ) {
                messageService.showInfo( data.i18n.TutorModeReminder );
            }
            expertModeEnabled( data.expertButton.dbValue, data );
        }, data.expertTimeout * 1000 );
    } else {
        clearTimeout( expertTimer );
        _appCtxService.ctx.showTutorRibbon = false;
    }
};

export let promptExpert = function( data ) {
    var globalNavPanel = _appCtxService.ctx.awSidenavConfig.globalSidenavContext.globalNavigationSideNav;
    if( globalNavPanel.pinned !== true || globalNavPanel.open !== true ) {
        if( data.expertButton.dbValue === true ) {
            messageService.showInfo( data.i18n.TutorModeDisabled );
        }
        _appCtxService.ctx.showTutorRibbon = false;
        expertMode = false;
        data.expertButton.dbValue = false;
    }
};

let isAWAEnabled = function() {
    if( _appCtxService.ctx.preferences &&
        _appCtxService.ctx.preferences.AWA_is_feature_installed && _appCtxService.ctx.preferences.AWA_is_feature_installed[ 0 ] === 'true' ) {
        return true;
    }
    return false;
};

let getEquivalent = function( objectInfo ) {
    var duplicate = {};
    for( const key in objectInfo ) {
        if( objectInfo.hasOwnProperty( key ) ) {
            duplicate[ key ] = objectInfo[ key ];
        }
    }
    return duplicate;
};

let getParameterInfo = function() {
    var currentSublocation;
    if( _appCtxService.ctx.xrtPageContext !== undefined && _appCtxService.ctx.xrtPageContext.primaryXrtPageID !== undefined ) {
        currentSublocation = 't:' + _appCtxService.ctx.xrtPageContext.primaryXrtPageID;
    } else {
        currentSublocation = 's:' + _appCtxService.ctx.sublocation.historyNameToken;
    }

    if( _appCtxService.ctx.mselected && _appCtxService.ctx.mselected !== null && _appCtxService.ctx.mselected.length >= 1 ) {
        var obj_Array = _appCtxService.ctx.mselected;
        var typeFlag = 0;
        for( let index = 1; index < _appCtxService.ctx.mselected.length; index++ ) {
            if( obj_Array[ index ].type === obj_Array[ index - 1 ].type ) {
                continue;
            } else {
                typeFlag = 1;
                break;
            }
        }
        if( typeFlag === 0 ) {
            _appCtxService.ctx.PredictiveInfo.selectionMode = _appCtxService.ctx.mselected.length > 1 ? 1 : 0;
        }
    } else {
        _appCtxService.ctx.PredictiveInfo.selectionMode = 0;
    }
    return ParameterInfo = {
        previousCommand: 'ANYCOMMAND',
        currentCommand: currentSublocation,
        currentLocation: currentSublocation,
        objectType: _appCtxService.ctx.selected && _appCtxService.ctx.selected !== null && _appCtxService.ctx.selected.type ? _appCtxService.ctx.selected.type : '',
        nextLocation: currentSublocation,
        selectionMode: _appCtxService.ctx.PredictiveInfo.selectionMode === 1 ? 'MULTIPLE' : 'SINGLE',
        user: _appCtxService.ctx.userSession.props.user.dbValues[ 0 ],
        group: _appCtxService.ctx.userSession.props.group.dbValues[ 0 ],
        role: _appCtxService.ctx.userSession.props.role.dbValues[ 0 ],
        workspace: _appCtxService.ctx.workspace.workspaceId,
        analyticsData: _appCtxService.ctx.PredictiveInfo.analyticsInfo
    };
};

let executeCommandCell = function( command, commandId, localParamInfo ) {
    switch ( command ) {
        case 'Highlight':
            if( commandId.includes( 'Awa0SuggestedTab' ) ) {
                cfgSvc.getCfg( 'commandsViewModel' ).then( function( viewModelJson ) {
                    const action = viewModelJson.commandHandlers[commandId + 'Handler'].action;
                    const type = viewModelJson.actions[action].inputData.type;
                    const tabId = viewModelJson.actions[action].inputData.selection;
                    if( type === 'URL' || type === 'XRT' ) {
                        if( tabRegistryService.getVisibleTabs( 'primary' ) ) {
                            tabRegistryService.highlightTab( 'primary', tabId );
                        }
                    } else if( type === 'secondary' ) {
                        if( tabRegistryService.getVisibleTabs( 'secondary' ) ) {
                            tabRegistryService.highlightTab( 'secondary', tabId );
                        }
                    } else if( type === 'occmgmtContext' ) {
                        if( tabRegistryService.getVisibleTabs( 'occmgmtContext' ) ) {
                            tabRegistryService.highlightTab( 'occmgmtContext', tabId );
                        }
                    }
                } );
            } else {
                commandHighlightService.highlightCommand( commandId, ':not([anchor*=aw_PredictedCmds] button)' );
            }
            break;
        case 'Upvote':
            var payLoad = {
                commandData: localParamInfo
            };
            post( payLoad, microServiceURLLikeService, {} );
            break;
        case 'Downvote':
            var payLoad = {
                commandData: localParamInfo
            };
            post( payLoad, microServiceURLDisLikeService, {} );
            break;
        default:
            break;
    }
};

export let commandCellInput = function( command, serial ) {
    var panelcommandlist = document.querySelector( '[id^="aw_PredictedCmds"]' );
    if( panelcommandlist !== undefined ) {
        var nodelist = panelcommandlist.querySelectorAll( '[type="button"]' );
    }
    if( nodelist !== undefined ) {
        var localParamInfo = getEquivalent( ParameterInfo );
        var analyticsInfo = _appCtxService.ctx.PredictiveInfo.analyticsInfo;
        analyticsInfo.commandRank = serial;
        analyticsInfo.commandGroup = command;
        localParamInfo.analyticsData = analyticsInfo;
        localParamInfo.previousCommand = localParamInfo.currentCommand;
        localParamInfo.currentLocation = localParamInfo.nextLocation;
        const commandId = nodelist[ serial ].getAttribute( 'button-id' );

        if ( command === 'Upvote' ) {
            _appCtxService.ctx.PredictiveInfo.LikeDislikeInfo[ 'isLiked' + serial ] = true;
        } else if ( command === 'Downvote' ) {
            _appCtxService.ctx.PredictiveInfo.LikeDislikeInfo[ 'isDisLiked' + serial ] = true;
        }

        if( commandId.includes( 'Awa0SuggestedTab' ) ) {
            cfgSvc.getCfg( 'commandsViewModel' ).then( function( viewModelJson ) {
                const action = viewModelJson.commandHandlers[commandId + 'Handler'].action;
                const type = viewModelJson.actions[action].inputData.type;
                const tabId = viewModelJson.actions[action].inputData.selection;
                if( type === 'URL' ) {
                    if( viewModelJson.actions[action].inputData.selectionName === '' ) {
                        localParamInfo.currentCommand = 's:' + tabId;
                    } else {
                        localParamInfo.currentCommand = 's:' + viewModelJson.actions[action].inputData.selectionName + ':' + tabId;
                    }
                } else if( type === 'XRT' ) {
                    localParamInfo.currentCommand = 't:' + tabId;
                } else if( type === 'secondary' || type === 'occmgmtContext' ) {
                    localParamInfo.currentCommand = 'st:' + tabId;
                }
                executeCommandCell( command, commandId, localParamInfo );
            } );
        } else {
            localParamInfo.currentCommand = commandId;
            executeCommandCell( command, commandId, localParamInfo );
        }
    }
};

export let attachCommands = function( data ) {
    var panelcommandlist = document.querySelector( '[id^="aw_PredictedCmds"]' );
    var panelLikeList = document.querySelector( '[id^="aw_LikeCmds"]' );
    if( panelcommandlist && panelLikeList ) {
        var nodelist = panelcommandlist.querySelectorAll( '[type="button"]' );
        var likelist = panelLikeList.querySelectorAll( '[type="button"]' );
        if( nodelist.length !== likelist.length && nodelist !== previousNodeList ) {
            var placements = [];
            previousNodeList = nodelist;
            var newAnchor = data.cellAnchorCount + 1;
            for( var i = 0; i < nodelist.length; i++ ) {
                //Reset all like dislike ctx values
                _appCtxService.ctx.PredictiveInfo.LikeDislikeInfo[ 'isLiked' + i ] = false;
                _appCtxService.ctx.PredictiveInfo.LikeDislikeInfo[ 'isDisLiked' + i ] = false;
                if( nodelist[i].getAttribute( 'aria-label' ) !== data.i18n.MORE_BUTTON_TITLE ) {
                    var likePlacement = {
                        id: 'Awa0Like' + i,
                        uiAnchor: 'aw_LikePredictedCmds' + newAnchor,
                        priority: i
                    };
                    var likeFilledPlacement = {
                        id: 'Awa0LikeFilled' + i,
                        uiAnchor: 'aw_LikePredictedCmds' + newAnchor,
                        priority: i
                    };
                    var dislikePlacement = {
                        id: 'Awa0DisLike' + i,
                        uiAnchor: 'aw_DisLikePredictedCmds' + newAnchor,
                        priority: i
                    };
                    var dislikeFilledPlacement = {
                        id: 'Awa0DisLikeFilled' + i,
                        uiAnchor: 'aw_DisLikePredictedCmds' + newAnchor,
                        priority: i
                    };
                    var highlightPlacement = {
                        id: 'Awa0Highlight' + i,
                        uiAnchor: 'aw_HighlightPredictedCmds' + newAnchor,
                        priority: i
                    };
                    placements.push( likePlacement );
                    placements.push( likeFilledPlacement );
                    placements.push( dislikePlacement );
                    placements.push( dislikeFilledPlacement );
                    placements.push( highlightPlacement );
                }
            }
            if( placements !== [] ) {
                var cmdCfgService = commandConfigurationService.instance;
                cmdCfgService.addPlacements( placements ).then( function( placementDestroyer ) {
                    if( cellDestroyPlacement !== null ) {
                        cellDestroyPlacement();
                    }
                    cellDestroyPlacement = placementDestroyer;
                    data.cellAnchorCount++;
                    data.IsCellCmdVisible = true;
                } );
            }
        } else {
            data.IsCellCmdVisible = true;
        }
    }
};

export let runCommand = function( type, selection, selectionName ) {
    if( type === 'XRT' ) {
        AwStateService.instance.go( '.', {
            uid: _appCtxService.ctx.selected === null || _appCtxService.ctx.selected === undefined ? '' : _appCtxService.ctx.selected.uid,
            page: selectionName,
            pageId: selection
        } );
        selection = 't:' + selection;
        if( selection !== _appCtxService.ctx.PredictiveInfo.currentCommand ) {
            _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
            _appCtxService.ctx.PredictiveInfo.currentCommand = selection;
            _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected === null || _appCtxService.ctx.selected === undefined ? '' : _appCtxService.ctx.selected.type;
            if( _appCtxService.ctx.PredictiveInfo.botype !== '' && _appCtxService.ctx.selected.props.awb0UnderlyingObjectType ) { // If workarea has a facade object selected
                _appCtxService.ctx.PredictiveInfo.selectionMode = 'SINGLE';
                _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected.props.awb0UnderlyingObjectType.dbValues[ 0 ];
            } else if( _appCtxService.ctx.PredictiveInfo.botype !== '' && _appCtxService.ctx.pselected ) { // If something is selected in any workarea, but tabs on the primary object is clicked
                _appCtxService.ctx.PredictiveInfo.selectionMode = 'SINGLE';
                _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.pselected.type;
            }
            exports.serviceCall( selection, _appCtxService.ctx.PredictiveInfo.botype );
            //Change current sublocation AFTER the Soa call.
            _appCtxService.ctx.PredictiveInfo.predictSublocationId = selection;
        }
    } else if( type === 'URL' ) {
        var navInput = {
            actionType: 'Navigate',
            navigateTo: selection
        };
        navigationSvc.navigate( navInput, {} );
        selection = selectionName !== '' ? 's:' + selectionName + ':' + selection : 's:' + selection;
        if( selection !== _appCtxService.ctx.PredictiveInfo.currentCommand ) {
            _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
            _appCtxService.ctx.PredictiveInfo.currentCommand = selection;
            _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected === null || _appCtxService.ctx.selected === undefined ? '' : _appCtxService.ctx.selected.type;
            exports.serviceCall( selection, _appCtxService.ctx.PredictiveInfo.botype );
            //Change current sublocation AFTER the Soa call.
            _appCtxService.ctx.PredictiveInfo.predictSublocationId = selection;
        }
    } else if( type === 'Secondary XRT' ) {
        if( tabRegistryService.getVisibleTabs( 'secondary' ) !== null ) {
            tabRegistryService.changeTab( 'secondary', selection );
        }
        selection = 'st:' + selection;
        if( selection !== _appCtxService.ctx.PredictiveInfo.currentCommand ) {
            _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
            _appCtxService.ctx.PredictiveInfo.currentCommand = selection;
            _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected === null || _appCtxService.ctx.selected === undefined ? '' : _appCtxService.ctx.selected.type;
            if( _appCtxService.ctx.PredictiveInfo.botype !== '' && _appCtxService.ctx.selected.props.awb0UnderlyingObjectType ) { // If workarea has a facade object selected
                _appCtxService.ctx.PredictiveInfo.selectionMode = 'SINGLE';
                _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected.props.awb0UnderlyingObjectType.dbValues[ 0 ];
            } else if( _appCtxService.ctx.PredictiveInfo.botype !== '' && _appCtxService.ctx.pselected ) { // If something is selected in any workarea, but tabs on the primary object is clicked
                _appCtxService.ctx.PredictiveInfo.selectionMode = 'SINGLE';
                _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.pselected.type;
            }
            exports.serviceCall( selection, _appCtxService.ctx.PredictiveInfo.botype );
            //Change current sublocation AFTER the Soa call.
            _appCtxService.ctx.PredictiveInfo.predictSublocationId = selection;
        }
    }
};

export let prepareDataForPopup = function( ctx, data, commandValues ) {
    var placements = [];
    var tabCounter = 0;
    var stateCommands = [];
    if( commandValues === undefined ) {
        commandValues = _appCtxService.ctx.PredictiveInfo.commandValues;
        data.anchorCount = _appCtxService.ctx.PredictiveInfo.newAnchor;
    }
    if( commandValues ) {
        _appCtxService.ctx.PredictiveInfo.newAnchor++;
        cfgSvc.getCfg( 'commandsViewModel' ).then( function( viewModelJson ) {
            for( var i = 0; i < commandValues.length; i++ ) {
                //Filter based on invalid command list
                if( soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_commands_to_skip &&
                    soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_commands_to_skip.indexOf( commandValues[ i ] ) > -1 ) {
                    continue;
                }
                if( commandValues[ i ].includes( 'com.siemens.splm.clientfx.tcui.xrt.showObject' ) ) {
                    continue;
                }
                //Filter out Group and Content commands
                if( commandValues[ i ].includes( 'Group' ) ) {
                    continue;
                }
                var commandToReturn = null;

                if( viewModelJson ) {
                    commandToReturn = viewModelJson.commands[ commandValues[ i ] ];
                }
                var placement = {};
                if( commandToReturn ) {
                    if( commandToReturn.title ) {
                        // Retrieving only the command which is being asked for
                        placement = {
                            id: commandValues[ i ],
                            uiAnchor: 'aw_PredictedCmds' + _appCtxService.ctx.PredictiveInfo.newAnchor,
                            priority: i
                        };
                        placements.push( placement );
                    }
                } else {
                    var cmdArray = commandValues[ i ].split( ':' );
                    if( cmdArray[ 0 ] === 't' ) {
                        var pageDispName = '';
                        var availableTabs = tabRegistryService.getVisibleTabs( 'primary' );
                        availableTabs.forEach( tabData => {
                            if( tabData.id === cmdArray[ 1 ] && tabData.selectedTab === false ) {
                                pageDispName = tabData.name;
                            }
                        } );
                        if( pageDispName !== '' ) {
                            viewModelJson.commands[ 'Awa0SuggestedTab' + tabCounter ].title = pageDispName;
                            viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.type = 'XRT';
                            viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.selectionName = pageDispName;
                            viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.selection = cmdArray.length === 3 ? cmdArray[ 2 ] : cmdArray[ 1 ];
                            placement = {
                                id: 'Awa0SuggestedTab' + tabCounter++,
                                uiAnchor: 'aw_PredictedCmds' + _appCtxService.ctx.PredictiveInfo.newAnchor,
                                priority: i
                            };
                            placements.push( placement );
                            continue;
                        }
                    } else if( cmdArray[ 0 ] === 's' ) {
                        viewModelJson.commands[ 'Awa0SuggestedTab' + tabCounter ].title = cmdArray[ 1 ];
                        viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.type = 'URL';
                        viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.selection = cmdArray.length === 3 ? cmdArray[ 2 ] : cmdArray[ 1 ];
                        viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.selectionName = cmdArray.length === 3 ? cmdArray[ 1 ] : '';
                        placement = {
                            id: 'Awa0SuggestedTab' + tabCounter,
                            uiAnchor: 'aw_PredictedCmds' + _appCtxService.ctx.PredictiveInfo.newAnchor,
                            priority: i
                        };
                        var cmdAssignment = {
                            cmd: 'Awa0SuggestedTab' + tabCounter,
                            url: cmdArray[ 1 ]
                        };
                        placements.push( placement );
                        if( cmdArray.length === 2 ) {
                            stateCommands.push( cmdAssignment );
                        }
                        tabCounter++;
                    } else if( cmdArray[ 0 ] === 'st' ) {
                        var pageDispName = '';
                        var availableTabs = tabRegistryService.getVisibleTabs( 'secondary' );
                        if( availableTabs !== null ) {
                            availableTabs.forEach( tabData => {
                                if( tabData.tabKey === cmdArray[ 1 ] && tabData.selectedTab === false ) {
                                    pageDispName = tabData.name;
                                }
                            } );
                            if( pageDispName !== '' ) {
                                viewModelJson.commands[ 'Awa0SuggestedTab' + tabCounter ].title = pageDispName;
                                viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.type = 'Secondary XRT';
                                viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.selectionName = pageDispName;
                                viewModelJson.actions[ 'tabAction' + tabCounter ].inputData.selection = cmdArray.length === 3 ? cmdArray[ 2 ] : cmdArray[ 1 ];
                                placement = {
                                    id: 'Awa0SuggestedTab' + tabCounter++,
                                    uiAnchor: 'aw_PredictedCmds' + _appCtxService.ctx.PredictiveInfo.newAnchor,
                                    priority: i
                                };
                                placements.push( placement );
                                continue;
                            }
                        }
                    }
                }
            }
            cfgSvc.getCfg( 'states' ).then( function( states ) {
                stateCommands.forEach( assignment => {
                    if( states[ assignment.url ] ) {
                        var label = states[ assignment.url ].data.label;
                        localeSvc.getLocalizedText( label.source, label.key ).then( function( tabName ) {
                            if( tabName === undefined ) {
                                var temp_placements = [];
                                placements.forEach( toKeep => {
                                    if( toKeep.id !== assignment.cmd ) {
                                        temp_placements.push( toKeep );
                                    }
                                } );
                                placements = temp_placements;
                            } else {
                                viewModelJson.commands[ assignment.cmd ].title = tabName;
                            }
                        } );
                    }
                } );
            } ).then( function() {
                var cmdCfgService = commandConfigurationService.instance;
                cmdCfgService.addPlacements( placements ).then( function( placementDestroyer ) {
                    if( destroyPlacement !== null ) {
                        destroyPlacement();
                    }
                    destroyPlacement = placementDestroyer;
                    data.anchorCount++;
                    data.cellAnchorCount++;
                    data.IsCellCmdVisible = false;
                } );
            } );
        } );
        eventBus.publish( 'Awa0ShowPredictions.reloadContent', {} );
    }
};

export let serviceCall = function( sublocationKey, selBOType ) {
    // Computation for Assistant Panel Usage Analytics
    // Check rank of current command in Command List Displayed in Assistant
    var analyticsInfo =  null;
    if( _appCtxService.ctx.PredictiveInfo.analyticsInfo ) {
        analyticsInfo =  _appCtxService.ctx.PredictiveInfo.analyticsInfo;
        if( analyticsInfo.commandGroup !== null && analyticsInfo.commandGroup !== undefined ) {
            var panelcommandlist = document.querySelector( '[id^="aw_PredictedCmds"]' );
            if( panelcommandlist ) {
                var nodelist = panelcommandlist.querySelectorAll( '[type="button"]' );
                if( nodelist ) {
                    var commandidlist = [];
                    nodelist.forEach( element => {
                        commandidlist.push( element.getAttribute( 'button-id' ) );
                    } );
                    if( analyticsInfo.commandGroup.includes( 'aw_PredictedCmds' ) ) {
                        if( commandidlist.indexOf( _appCtxService.ctx.PredictiveInfo.currentCommand ) !== -1 ) {
                            analyticsInfo.commandRank = commandidlist.indexOf( _appCtxService.ctx.PredictiveInfo.currentCommand );
                        } else {
                            analyticsInfo = null;
                        }
                    }
                }
            } else {
               analyticsInfo.commandRank = -1;
            }
            if( analyticsInfo !== null ) {
               analyticsInfo.logInfo = logInfo;
                logInfo = '';
            }
        }  else {
           analyticsInfo = null;
        }
    }


    if( !isAWAEnabled() ) {
        return;
    }
    //Reset flag as Soa is called
    var boType = '';
    if( destroyPlacement ) {
        destroyPlacement();
        destroyPlacement = null;
    }
    if( cellDestroyPlacement ) {
        cellDestroyPlacement();
        cellDestroyPlacement = null;
    }
    //For specific event data
    if( selBOType ) {
        boType = selBOType;
    } else if( _appCtxService.ctx.mselected ) {
        if( _appCtxService.ctx.mselected.length > 0 ) {
            boType = _appCtxService.ctx.mselected[ 0 ].type;
        } else if( _appCtxService.ctx.mselected.length === 0 && _appCtxService.ctx.locationContext && _appCtxService.ctx.locationContext.modelObject ) {
            boType = _appCtxService.ctx.locationContext.modelObject.type;
        }
    }

    _appCtxService.ctx.PredictiveInfo.boType = boType;

    ParameterInfo = {
        previousCommand: _appCtxService.ctx.PredictiveInfo.previousCommand,
        currentCommand: _appCtxService.ctx.PredictiveInfo.currentCommand,
        currentLocation: _appCtxService.ctx.PredictiveInfo.predictSublocationId,
        objectType: boType,
        nextLocation: '',
        selectionMode: _appCtxService.ctx.PredictiveInfo.selectionMode,
        user: _appCtxService.ctx.userSession.props.user.dbValues[ 0 ],
        group: _appCtxService.ctx.userSession.props.group.dbValues[ 0 ],
        role: _appCtxService.ctx.userSession.props.role.dbValues[ 0 ],
        workspace: _appCtxService.ctx.workspace.workspaceId
    };

    //If command changes sublocation, set predict options
    if( sublocationKey ) {
        ParameterInfo.nextLocation = sublocationKey;
    } else {
        ParameterInfo.nextLocation = ParameterInfo.currentLocation;
    }

    if( ParameterInfo.previousCommand === '' ) {
        ParameterInfo.previousCommand = 'ANYCOMMAND';
    }

    ParameterInfo.selectionMode = _appCtxService.ctx.PredictiveInfo.selectionMode === 1 ? 'MULTIPLE' : 'SINGLE';

    if( !_enabled ) {
        _logCommandsList.commandData.push( ParameterInfo );
        var dup_paramInfo = getEquivalent( ParameterInfo );
        if( dup_paramInfo.previousCommand !== ParameterInfo.currentLocation ) {
            dup_paramInfo.previousCommand = dup_paramInfo.currentLocation;
            _logCommandsList.commandData.push( dup_paramInfo );
        }
    } else {
        ParameterInfo.analyticsData = analyticsInfo;
        var payLoad = {
            commandData: ParameterInfo,
            expertMode: expertMode
        };
        var predPromise = post( payLoad, microServiceURLPredictionService, {} );
        predPromise.then( function( res ) {
            if( 'predictions' in res.data ) {
                if( JSON.stringify( res.config.data.commandData ) === JSON.stringify( ParameterInfo ) ) {
                    var commands_pred = [];
                    res.data.predictions.forEach( command => {
                        if( typeof command === 'string' ) {
                            commands_pred.push( command );
                        }else{
                            commands_pred.push( command.commandName );
                        }
                    } );
                    _appCtxService.ctx.PredictiveInfo.commandValues = commands_pred;
                    eventBus.publish( 'populatePrediction', commands_pred );
                }
            }
        } );
    }
};

export let assignEventlistener = function( eventData ) {
    if( _enabled ) {
        listenCommandEvents( eventData );
    } else {
        trainCommandEvents( eventData );
    }
};

let trainCommandEvents = function( eventData ) {
    _appCtxService.ctx.PredictiveInfo.analyticsInfo.commandGroup = eventData.commandAnchor;
    if( !eventData.sanCommandId.includes( 'Group' ) ) {
        //Filter based on invalid command list
        if( soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_commands_to_skip &&
            soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_commands_to_skip.indexOf( eventData.sanCommandId ) < 0 ) {
            //Filter based on invalid anchor list
            if( eventData.commandAnchor && eventData.commandAnchor.split( ',' ).length > 1 ) {
                eventData.commandAnchor = eventData.commandAnchor.split( ',' )[ 0 ];
            }
            //Prepare context data
            if( soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_command_anchors_to_process &&
                soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_command_anchors_to_process.indexOf( eventData.commandAnchor ) > -1 ||
                eventData.commandAnchor.includes( 'aw_PredictedCmds' ) ) {
                var currentSublocation;
                if( _appCtxService.ctx.xrtPageContext !== undefined && _appCtxService.ctx.xrtPageContext.primaryXrtPageID !== undefined ) {
                    currentSublocation = 't:' + _appCtxService.ctx.xrtPageContext.primaryXrtPageID;
                } else {
                    currentSublocation = 's:' + _appCtxService.ctx.sublocation.historyNameToken;
                }

                if( _appCtxService.ctx.PredictiveInfo.predictSublocationId !== currentSublocation ) {
                    _appCtxService.ctx.PredictiveInfo.previousCommand = currentSublocation;
                    _appCtxService.ctx.PredictiveInfo.currentCommand = eventData.sanCommandId;
                    _appCtxService.ctx.PredictiveInfo.predictSublocationId = currentSublocation;
                } else {
                    _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
                    _appCtxService.ctx.PredictiveInfo.currentCommand = eventData.sanCommandId;
                }

                if( _appCtxService.ctx.mselected.length >= 1 ) {
                    var obj_Array = _appCtxService.ctx.mselected;
                    var typeFlag = 0;
                    for( let index = 1; index < _appCtxService.ctx.mselected.length; index++ ) {
                        if( obj_Array[ index ].type === obj_Array[ index - 1 ].type ) {
                            continue;
                        } else {
                            typeFlag = 1;
                            break;
                        }
                    }
                    if( typeFlag === 0 ) {
                        var currentSelectionMode = _appCtxService.ctx.mselected.length > 1 ? 1 : 0;
                        if( _appCtxService.ctx.PredictiveInfo.selectionMode !== currentSelectionMode || _appCtxService.ctx.PredictiveInfo.boType !== _appCtxService.ctx.mselected[ 0 ].type ) {
                            _appCtxService.ctx.PredictiveInfo.previousCommand = currentSublocation;
                        }
                        _appCtxService.ctx.PredictiveInfo.selectionMode = currentSelectionMode;
                        exports.serviceCall( undefined, _appCtxService.ctx.mselected[ 0 ].type );
                    }
                } else {
                    if( _appCtxService.ctx.PredictiveInfo.selectionMode !== 0 ) {
                        _appCtxService.ctx.PredictiveInfo.previousCommand = currentSublocation;
                    }
                    _appCtxService.ctx.PredictiveInfo.selectionMode = 0;
                    exports.serviceCall( undefined, '' );
                }
            } else {
                logInfo = logInfo + '\{commandAnchor:' + eventData.commandAnchor + '},';
            }
        } else {
            logInfo = logInfo + '\{commandId:' + eventData.sanCommandId + '},';
        }
    } else {
        logInfo = logInfo + '\{commandId:' + eventData.sanCommandId + '},';
    }
};

let listenCommandEvents = function( eventData ) {
    _appCtxService.ctx.PredictiveInfo.analyticsInfo.commandGroup = eventData.commandAnchor;
    if( !eventData.sanCommandId.includes( 'Group' ) && !eventData.sanCommandId.includes( 'Awa0SuggestedTab' ) ) {
        //Filter based on invalid command list
        if( soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_commands_to_skip &&
            soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_commands_to_skip.indexOf( eventData.sanCommandId ) < 0 ) {
            //Filter based on invalid anchor list
            if( eventData.commandAnchor && eventData.commandAnchor.split( ',' ).length > 1 ) {
                eventData.commandAnchor = eventData.commandAnchor.split( ',' )[ 0 ];
            }
            //Prepare context data
            if( soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_command_anchors_to_process &&
                soa_preferenceService.getLoadedPrefs().AWA_valid_list_of_command_anchors_to_process.indexOf( eventData.commandAnchor ) > -1 ||
                eventData.commandAnchor.includes( 'aw_PredictedCmds' ) ) {
                _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
                _appCtxService.ctx.PredictiveInfo.currentCommand = eventData.sanCommandId;
                exports.serviceCall();
            } else if( eventData.sanCommandId === 'Tile' ) {
                if( eventData.tileInfo.action.hasOwnProperty( 'actionParams' ) === false ) {
                    var tileToken;
                    if( eventData.tileInfo.action.actionType === 0 ) {
                        var locUrl = eventData.tileInfo.action.url;
                        tileToken = 's:' + eventData.tileInfo.displayName + ':' + locUrl;
                    } else {
                        tileToken = eventData.tileInfo.action.commandId;
                    }
                    _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
                    _appCtxService.ctx.PredictiveInfo.currentCommand = tileToken;
                    exports.serviceCall();
                }
            } else if( eventData.commandAnchor === 'Tab' ) {
                var secondaryTabs = tabRegistryService.getVisibleTabs( 'secondary' );
                if( secondaryTabs !== null ) {
                    secondaryTabs.forEach( element => {
                        if( element.tabKey === eventData.sanCommandId && element.selectedTab === true ) {
                            _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
                            _appCtxService.ctx.PredictiveInfo.currentCommand = 'st:' + element.tabKey;
                            exports.serviceCall();
                        }
                    } );
                }
            } else {
                logInfo = logInfo + '\{commandAnchor:' + eventData.commandAnchor + '},';
            }
        } else {
            logInfo = logInfo + '\{commandId:' + eventData.sanCommandId + '},';
        }
    } else {
        logInfo = logInfo + '\{commandId:' + eventData.sanCommandId + '},';
    }
};

export let stateChangeEventListener = function( eventData ) {
    _appCtxService.ctx.PredictiveInfo.analyticsInfo.commandGroup = eventData.commandAnchor;
    if( eventData.name === 'sublocation' && eventData.value !== undefined ) { // This code block addresses sublocation change due to URL navigation
        if( _appCtxService.ctx.xrtPageContext === undefined || _appCtxService.ctx.xrtPageContext.primaryXrtPageID === undefined ) {
            var tabSelectionData = {
                tabId: 's:' + eventData.value.historyNameToken
            };
            // No extra call if same tab gets clicked on multiple times
            if( tabSelectionData.tabId !== _appCtxService.ctx.PredictiveInfo.currentCommand ) {
                _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
                _appCtxService.ctx.PredictiveInfo.currentCommand = tabSelectionData.tabId;
                _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected === null || _appCtxService.ctx.selected === undefined ? '' : _appCtxService.ctx.selected.type;
                exports.serviceCall( tabSelectionData.tabId, _appCtxService.ctx.PredictiveInfo.botype );
                //Change current sublocation AFTER the Soa call.
                _appCtxService.ctx.PredictiveInfo.predictSublocationId = tabSelectionData.tabId;
            }
        }
    }
    eventBus.unsubscribe( 'appCtx.register' );
};

export let xrtSublocationChangeEventListener = function( eventData ) {
    _appCtxService.ctx.PredictiveInfo.analyticsInfo.commandGroup = eventData.commandAnchor;
    if( eventData.name === 'xrtPageContext' && eventData.value.primaryXrtPageID !== undefined ) {
        var tabSelectionData = {
            tabId: 't:' + eventData.value.primaryXrtPageID
        };
        // No extra call if same tab gets clicked on multiple times
        if( tabSelectionData.tabId !== _appCtxService.ctx.PredictiveInfo.currentCommand ) {
            _appCtxService.ctx.PredictiveInfo.previousCommand = _appCtxService.ctx.PredictiveInfo.currentCommand;
            _appCtxService.ctx.PredictiveInfo.currentCommand = tabSelectionData.tabId;
            _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected === null || _appCtxService.ctx.selected === undefined ? '' : _appCtxService.ctx.selected.type;
            if( _appCtxService.ctx.PredictiveInfo.botype !== '' && _appCtxService.ctx.selected.props.awb0UnderlyingObjectType ) { // If workarea has a facade object selected
                _appCtxService.ctx.PredictiveInfo.selectionMode = 'SINGLE';
                _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.selected.props.awb0UnderlyingObjectType.dbValues[ 0 ];
            } else if( _appCtxService.ctx.PredictiveInfo.botype !== '' && _appCtxService.ctx.pselected ) { // If something is selected in any workarea, but tabs on the primary object is clicked
                _appCtxService.ctx.PredictiveInfo.selectionMode = 'SINGLE';
                _appCtxService.ctx.PredictiveInfo.botype = _appCtxService.ctx.pselected.type;
            }
            exports.serviceCall( tabSelectionData.tabId, _appCtxService.ctx.PredictiveInfo.botype );
            //Change current sublocation AFTER the Soa call.
            _appCtxService.ctx.PredictiveInfo.predictSublocationId = tabSelectionData.tabId;
        }
    }
    eventBus.unsubscribe( 'appCtx.update' );
};

export let selectionChangeEventListener = function() {
    var undefinedKey;
    //In case of single item selection, predict on that BO type only.
    if( _appCtxService.ctx.mselected.length === 1 ) {
        // Avoid firing excess service calls if different object of same BO is clicked.
        _appCtxService.ctx.PredictiveInfo.previousCommand = 'NOCOMMAND';
        _appCtxService.ctx.PredictiveInfo.currentCommand = _appCtxService.ctx.PredictiveInfo.predictSublocationId;
        _appCtxService.ctx.PredictiveInfo.boType = _appCtxService.ctx.selected.type;
        if( _appCtxService.ctx.PredictiveInfo.selectionMode !== 0 ) { // But, fire call if change is in selectionMode, single <--> multiple
            _appCtxService.ctx.PredictiveInfo.selectionMode = 0;
        }
        exports.serviceCall( undefinedKey, _appCtxService.ctx.selected.type );
    } else if( _appCtxService.ctx.mselected.length > 1 ) { // In case of more than 1 selections, check if selections are of same type to predict.
        var multiflag = 0;
        for( var i = 1; i < _appCtxService.ctx.mselected.length; i++ ) {
            if( _appCtxService.ctx.mselected[ i ].type !== _appCtxService.ctx.mselected[ i - 1 ].type ) {
                multiflag = 1;
                continue;
            }
        }
        // Avoid firing excess service calls if different object of same BO is clicked.
        if( multiflag === 0 ) {
            _appCtxService.ctx.PredictiveInfo.previousCommand = 'NOCOMMAND';
            _appCtxService.ctx.PredictiveInfo.currentCommand = _appCtxService.ctx.PredictiveInfo.predictSublocationId;
            _appCtxService.ctx.PredictiveInfo.boType = _appCtxService.ctx.selected.type;
            if( _appCtxService.ctx.PredictiveInfo.selectionMode !== 1 ) { // But, fire call if change is in selectionMode, single <--> multiple
                _appCtxService.ctx.PredictiveInfo.selectionMode = 1;
            }
            exports.serviceCall( undefinedKey, _appCtxService.ctx.selected.type );
        } else { // Empty predictions for heterogenous selections.
            _appCtxService.ctx.PredictiveInfo.commandValues = [];
            eventBus.publish( 'populatePrediction', _appCtxService.ctx.PredictiveInfo.commandValues );
        }
    } else { // No item selected
        exports.serviceCall( undefinedKey, '' );
    }
};

/**
 * This method should be called when the client determines that Training Prediction service should be disabled.
 */
export let enablePrediction = function() {
    if( !_enabled && isAWAEnabled() ) {
        // Force commit all pending commands info in command queue
        _logEventDataAtIdle();
        var payLoad = {
            commandData: getParameterInfo(),
            expertMode: expertMode
        };

        //handled request body empty exception
        if( payLoad.commandData.analyticsData ) {
            if(  payLoad.commandData.analyticsData.commandGroup !== null && payLoad.commandData.analyticsData.commandGroup !== undefined ) {
                payLoad.commandData.analyticsData.commandRank = -1;
            }
        }

        post( payLoad, microServiceURLPredictionService, {} ).then( function( res ) {
            if( 'predictions' in res.data ) {
                if( JSON.stringify( res.config.data.commandData ) === JSON.stringify( ParameterInfo ) ) {
                    var commands_pred = [];
                    res.data.predictions.forEach( command => {
                        if( typeof command === 'string' ) {
                            commands_pred.push( command );
                        }else{
                            commands_pred.push( command.commandName );
                        }
                    } );
                    _appCtxService.ctx.PredictiveInfo.commandValues = commands_pred;
                    eventBus.publish( 'loadedPrediction', commands_pred );
                }
            }
        } );
        _enabled = true;
        eventBus.unsubscribe( _idleEventListener );
        _idleEventListener = null;
    }
};
/**
 * This method should be called when the client determines that Training Prediction service should be enabled.
 */
export let disablePrediction = function() {
    if( _enabled ) {
        _enabled = false;
        // Subscribe to events for logging.

        _idleEventListener = eventBus.subscribe( 'prediction-idle', _logEventDataAtIdle );
    }
};
/**
 * This method should be called when the client determines that Training Prediction service should be enabled.
 */
export let init = function() {
    exports.disablePrediction();
    _idleSetup();
    _loadCommandsSetup();
};
/**
 * This method logs all the data stored by _logCommandsList in FIFO during Idle time.
 *
 */
function _logEventDataAtIdle() {
    if( !_enabled && isAWAEnabled() && _logCommandsList.commandData.length !== 0 ) {
        // make service call with command data
        post( _logCommandsList, microServiceURLTrainingService, {} ).then( function() {
            _logCommandsList.commandData = [];
        } );
    }
}
/**
 * This waits for either a "progress.start" or "progress.end" event to come in and once they do, it starts up an idle event publisher.
 */
function _idleSetup() {
    /**
     * @param {String|null} endPoint - optional endPoint of the progress event
     */
    function processEvent( endPoint ) {
        if( !/\/getUnreadMessages$/.test( endPoint ) ) {
            eventBus.unsubscribe( progressStartListener );
            eventBus.unsubscribe( progressEndListener );
            _startupIdleEventPublisher();
        }
    }
    var progressStartListener = eventBus.subscribe( 'progress.start', processEvent );
    var progressEndListener = eventBus.subscribe( 'progress.end', processEvent );
}
/**
 * Sets up an Idle event publisher. This publisher uses a burndown timer which checks how long it has been since a "progress.end" or "progress.start"
 * event has come in. If one of those events come in, the burndown timer is restarted. Once the burndown exceeds its timer it will fire a single "idle"
 * event and then resume listening for a "progress.end"/"progress.start" event.
 */
function _startupIdleEventPublisher() {
    var idleBurndown;
    /**
     */
    function processEvent() {
        clearTimeout( idleBurndown );
        idleBurndown = _setupBurndownTimer( 'prediction-idle', 5, _idleSetup, progressStartListener, progressEndListener );
    }
    var progressStartListener = eventBus.subscribe( 'progress.start', processEvent );
    var progressEndListener = eventBus.subscribe( 'progress.end', processEvent );
    idleBurndown = _setupBurndownTimer( 'prediction-idle', 5, _idleSetup, progressStartListener, progressEndListener );
}

/**
 * This waits for either a "progress.start" or "progress.end" event to come in and once they do, it starts up an idle event publisher.
 */
function _loadCommandsSetup() {
    /**
     * @param {String|null} endPoint - optional endPoint of the progress event
     */
    function processEvent( endPoint ) {
        if( !/\/getUnreadMessages$/.test( endPoint ) ) {
            eventBus.unsubscribe( progressStartListener );
            eventBus.unsubscribe( progressEndListener );
            _loadCommandsEventPublisher();
        }
    }
    var progressStartListener = eventBus.subscribe( 'progress.start', processEvent );
    var progressEndListener = eventBus.subscribe( 'progress.end', processEvent );
}

/**
 * Sets up an Idle event publisher. This publisher uses a burndown timer which checks how long it has been since a "progress.end" or "progress.start"
 * event has come in. If one of those events come in, the burndown timer is restarted. Once the burndown exceeds its timer it will fire a single "idle"
 * event and then resume listening for a "progress.end"/"progress.start" event.
 */
function _loadCommandsEventPublisher() {
    var idleBurndown;
    /**
     */
    function processEvent() {
        clearTimeout( idleBurndown );
        idleBurndown = _setupBurndownTimer( 'load-commands', 0.5, _loadCommandsSetup, progressStartListener, progressEndListener );
    }
    var progressStartListener = eventBus.subscribe( 'progress.start', processEvent );
    var progressEndListener = eventBus.subscribe( 'progress.end', processEvent );
    idleBurndown = _setupBurndownTimer( 'load-commands', 0.5, _loadCommandsSetup, progressStartListener, progressEndListener );
}

/**
 * Creates the burndown timer
 *
 * @param {Object} progressStartListener - eventBus subscription handle
 * @param {Object} progressEndListener - eventBus subscription handle
 * @return {Number} A Number, representing the ID value of the timer that is set. Use this value with the clearTimeout() method to cancel the timer.
 */
function _setupBurndownTimer( publishText, idle_cutoff_seconds, runFunction, progressStartListener, progressEndListener ) {
    // var idle_cutoff_seconds = 1.5;
    return setTimeout( function() {
        eventBus.publish( publishText, {} );
        runFunction();
        eventBus.unsubscribe( progressStartListener );
        eventBus.unsubscribe( progressEndListener );
    }, idle_cutoff_seconds * 1000 );
}

export let updateMaxCount = function( data, type ) {
    if( type === 'MyRecent' ) {
        data.maxCountMyRecent = 20;
    } else if( type === 'TeamRecent' ) {
        if( data.preferences && data.preferences.AWA_max_recent_objects_count && data.preferences.AWA_max_recent_objects_count.length > 0 ) {
            data.maxCountTeamRecent = parseInt( data.preferences.AWA_max_recent_objects_count[ 0 ] );
        } else {
            data.maxCountTeamRecent = 20;
        }
    } else if( type === 'Favorites' ) {
        data.maxCountFavorites = 20;
    }
};

export let updateClipboardContent = function() {
    var clipboardViewModelObjects = [];
    var clipboardObjects = clipboardService.instance.getCachableObjects();
    if( clipboardObjects.length > 0 ) {
        clipboardObjects.forEach( obj => {
            var vmo = viewModelObjectService.constructViewModelObjectFromModelObject( obj );
            clipboardViewModelObjects.push( vmo );
        } );
    }
    return {
        awaClipboardContent: clipboardViewModelObjects
    };
};

export default exports = {
    prepareDataForPopup,
    serviceCall,
    enablePrediction,
    disablePrediction,
    init,
    assignEventlistener,
    xrtSublocationChangeEventListener,
    stateChangeEventListener,
    selectionChangeEventListener,
    runCommand,
    updateMaxCount,
    updateClipboardContent,
    expertModeEnabled,
    commandCellInput,
    attachCommands,
    promptExpert
};
/**
 * Return an Object of PredictiveUtils
 * @member predictiveUtils
 */
app.factory( 'predictiveUtils', () => exports );
