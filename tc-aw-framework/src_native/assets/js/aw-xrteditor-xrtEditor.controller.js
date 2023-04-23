// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global ace */

/**
 * This module contains a controller that handles saved search UI function.
 *
 * @module js/aw-xrteditor-xrtEditor.controller
 */
import * as app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import aceEditorUtils from 'js/aw-xrteditor-aceEditorUtils.service';
import localStrg from 'js/localStorage';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'js/aw-xrteditor-dropdown.directive';
import 'js/aw-xrteditor-commandsUtils.service';
import 'soa/sessionService';
import 'js/aw-xrteditor-xrtDOMUtils.service';
import 'soa/kernel/clientDataModel';
import 'soa/preferenceService';
import 'js/messagingService';
import 'soa/kernel/clientMetaModel';
import 'soa/kernel/soaService';
import 'soa/dataManagementService';
import 'js/aw-tree.directive';
import 'js/aw-splm-table.directive';
import 'js/aw-xrteditor-xrtContextUtils.service';
import 'js/aw-xrteditor-xrtCtxBreadcrumb.directive';
import 'js/aw-xrt-attr.directive';
import 'js/appCtxService';
import 'js/panelContentService';

var emptyXrtXml = '<?xml version="1.0" encoding="UTF-8"?><!-- Empty Rendering --><rendering></rendering>';

var _initBreadcumbModel = function( $scope, $state, soaSvc, contributionService ) {
    $scope.clientList = [ {
        id: 'AWC',
        label: 'Active Workspace'
    }, {
        id: 'TC',
        label: 'Teamcenter'
    } ];

    $scope.prefLocationList = [ {
        id: 'Site',
        label: 'Site'
    }, {
        id: 'Group',
        label: 'Group'
    }, {
        id: 'Role',
        label: 'Role'
    }, {
        id: 'User',
        label: 'User'
    } ];

    $scope.typeList = [];
    //Populate the typeList from getDisplayableTypes SOA
    var inputData = {
        input: [ {
            boTypeName: 'BusinessObject',
            exclusionBOTypeNames: []
        } ]
    };
    soaSvc.post( 'Core-2010-04-DataManagement', 'findDisplayableSubBusinessObjectsWithDisplayNames', inputData )
        .then( function( response ) {
            if( response ) {
                for( var ii = 0; ii < response.output.length; ii++ ) {
                    var displayableBOTypeNames = response.output[ ii ].displayableBOTypeNames;
                    for( var jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                        var tempObj = {
                            id: displayableBOTypeNames[ jj ].boName,
                            label: displayableBOTypeNames[ jj ].boName
                        };
                        $scope.typeList.push( tempObj );
                    }
                }
                $scope.typeList = _.sortBy( $scope.typeList, 'id' );
            }
        } );

    $scope.stylesheetTypeList = [ {
        id: 'SUMMARY',
        label: 'Summary'
    }, {
        id: 'CREATE',
        label: 'Create'
    }, {
        id: 'INFO',
        label: 'Information'
    }, {
        id: 'REVISE',
        label: 'Revise'
    }, {
        id: 'SAVEAS',
        label: 'Save As'
    } ];

    $scope.stylesheetTypeListTC = $scope.stylesheetTypeList.slice( 0, 2 ).concat( $scope.stylesheetTypeList.slice( 3, 5 ) );

    $scope.locationList = [ {
        id: '',
        label: ''
    }, {
        id: 'showObjectLocation',
        label: 'showObjectLocation'
    } ];

    $scope.subLocationList = [ {
        id: '',
        label: ''
    } ];

    //Populate the location and sublocation list
    //Note - showObjectLocation is a special case.
    var locationList = [ {
        id: 'showObjectLocation',
        label: 'showObjectLocation'
    } ];
    var subLocationList = [];

    var nullLoc = {
        id: '',
        label: ''
    };

    locationList.push( nullLoc );
    subLocationList.push( nullLoc );

    if( $state ) {
        var states = $state.get();
        for( var i in states ) {
            var state = states[ i ];
            if( state && state.type && state.name ) {
                var tempId = state.name.substring( state.name.lastIndexOf( '_' ) + 1 );
                tempId = tempId.substring( tempId.lastIndexOf( ':' ) + 1 );
                tempId = tempId.substring( tempId.lastIndexOf( '.' ) + 1 );

                var tempLoc = {
                    id: tempId,
                    label: tempId
                };

                if( state.type === 'location' ) {
                    locationList.push( tempLoc );
                } else if( state.type === 'subLocation' ) {
                    subLocationList.push( tempLoc );
                }
            }
        }
        // Need to add ace's sublocations as they do not use states or contribute.
        subLocationList.push( {
            id: 'objectNavigationSubLocation',
            label: 'objectNavigationSubLocation'
        } );
        subLocationList.push( {
            id: 'OccurrenceManagementSubLocation',
            label: 'OccurrenceManagementSubLocation'
        } );
        locationList = _.uniq( locationList, 'id' );
        subLocationList = _.uniq( subLocationList, 'id' );
        locationList = _.sortBy( locationList, 'id' );
        subLocationList = _.sortBy( subLocationList, 'id' );

        $scope.locationList = locationList;
        $scope.subLocationList = subLocationList;
    }

    //Async - add in the sublocations for showObjectLocation via the contributionService.
    contributionService.require( 'showObjectSubLocation' ).then( function( contributedSubLocations ) {
        for( var i in contributedSubLocations ) {
            var subLocObj = contributedSubLocations[ i ];

            var tempId = subLocObj.nameToken.substring( subLocObj.nameToken.lastIndexOf( '_' ) + 1 );
            tempId = tempId.substring( tempId.lastIndexOf( ':' ) + 1 );
            tempId = tempId.substring( tempId.lastIndexOf( '.' ) + 1 );

            var tempObj = {
                id: tempId,
                label: tempId
            };
            $scope.subLocationList.push( tempObj );
        }
        $scope.subLocationList = _.sortBy( $scope.subLocationList, 'id' );
    } );

    $scope.setBreadcrumbsFromStylesheetContext = function( stylesheetContext ) {
        $scope.selectedLocation = {
            id: stylesheetContext.location
        };

        $scope.selectedPreferenceLocation = {
            id: stylesheetContext.preferenceLocation
        };

        $scope.selectedStylesheetType = {
            id: stylesheetContext.stylesheetType
        };

        $scope.selectedSubLocation = {
            id: stylesheetContext.sublocation
        };

        $scope.selectedType = {
            id: stylesheetContext.type
        };

        if( stylesheetContext.client !== '' ) {
            $scope.selectedClient = {
                id: $scope.stylesheetContext.client
            };
        } else {
            $scope.selectedClient = {
                id: 'TC'
            };
        }
    };

    $scope.getStylesheetContextFromBreadcrumbs = function() {
        var stylesheetContext = {
            client: '',
            type: $scope.selectedType.id,
            location: '',
            sublocation: '',
            stylesheetType: $scope.selectedStylesheetType.id,
            preferenceLocation: $scope.selectedPreferenceLocation.id,
            datasetName: $scope.stylesheetContext.datasetName
        };

        if( $scope.selectedClient.id === 'AWC' ) {
            stylesheetContext.client = $scope.selectedClient.id;
        } else {
            stylesheetContext.client = '';
        }

        if( $scope.selectedLocation.id ) {
            stylesheetContext.location = $scope.selectedLocation.id;

            if( $scope.selectedSubLocation.id ) {
                stylesheetContext.sublocation = $scope.selectedSubLocation.id;
            }
        }

        return stylesheetContext;
    };

    $scope.getPreferenceNameFromStylesheetContext = function( stylesheetContext ) {
        var prefName = '';

        if( stylesheetContext.client === 'AWC' ) {
            prefName += stylesheetContext.client;
            prefName += '_';
        }

        prefName += stylesheetContext.type;

        if( stylesheetContext.location && stylesheetContext.location !== '' ) {
            prefName += '.';
            prefName += stylesheetContext.location;

            if( stylesheetContext.sublocation && stylesheetContext.sublocation !== '' ) {
                prefName += '.';
                prefName += stylesheetContext.sublocation;
            }
        }

        prefName += '.';
        prefName += stylesheetContext.stylesheetType;
        prefName += 'RENDERING';

        return prefName;
    };

    $scope.copyStylesheetContext = function( stylesheetContext ) {
        return {
            client: stylesheetContext.client,
            type: stylesheetContext.type,
            location: stylesheetContext.location,
            sublocation: stylesheetContext.sublocation,
            stylesheetType: stylesheetContext.stylesheetType,
            preferenceLocation: stylesheetContext.preferenceLocation,
            datasetName: stylesheetContext.datasetName
        };
    };

    $scope.setChangePending = function() {
        $scope.changePending = true;
    };

    $scope.getPropertyNamesFromType = function( typeData ) {
        var propertyNames = [];
        if( typeData && typeData.propertyDescriptorsMap ) {
            _.forEach( typeData.propertyDescriptorsMap, function( propDesc, propName ) {
                if( propDesc.constantsMap.displayable === '1' ) {
                    propertyNames.push( propName );
                }
            } );
        }
        return propertyNames;
    };

    $scope.setupNewEditorPage = function( data, xrtDOMService, clientMetaModel ) {
        if( data && data.stylesheetContext && data.xrt ) {
            $scope.initialData = data;
            $scope.datasetObject = data.datasetObject;
            $scope.stylesheetContext = data.stylesheetContext;
            $scope.initialModel = data.xrt;
            $scope.modelObject = $scope.initialModel;
            // If there is a type ensure that the type is loaded.
            $scope.type = data.stylesheetContext.type;
            if( $scope.type ) {
                var dsTypes = [ $scope.type ];

                soaSvc.ensureModelTypesLoaded( dsTypes ).then(
                    function() {
                        // Get the property names.
                        if( xrtDOMService ) {
                            xrtDOMService.setPropertyNames( $scope.getPropertyNamesFromType( clientMetaModel
                                .getType( data.stylesheetContext.type ) ) );
                        }
                    },
                    function( e ) {
                        logger.error( e );
                    } );
            }
        } else {
            $scope.datasetObject = null;
            $scope.stylesheetContext = {
                client: '',
                datasetName: '',
                location: '',
                preferenceLocation: '',
                stylesheetType: '',
                sublocation: '',
                type: ''
            };
            $scope.initialModel = emptyXrtXml;
            $scope.initialData = $scope.initialModel;
        }
        $scope.setXML( $scope.initialModel );
        $scope.setBreadcrumbsFromStylesheetContext( $scope.stylesheetContext );
    };
};

app.controller( 'XRTEditorCtrl', [
    '$scope',
    '$state',
    'viewModelService',
    'viewModelObjectService',
    'commandsService',
    'contributionService',
    'xrtContextService',
    'xrtDOMService',
    'soa_kernel_clientDataModel',
    'soa_kernel_clientMetaModel',
    'soa_kernel_soaService',
    'appCtxService',
    '$location',
    '$timeout',
    '$ocLazyLoad',
    'panelContentService',
    function( $scope, $state, viewModelService, viewModelObjectService, commandsService, contributionService, xrtContextService,
        xrtDOMService, clientDataModel, clientMetaModel, soaSvc, appCtxService, $location, $timeout, $ocLazyLoad, panelContentService ) {
        require( [ 'ace-builds/ace' ], function() {
            require( [ 'ace-builds/ace', 'ace-builds/ext-language_tools', 'lib/ui.ace-0.2.3/ui-ace' ], function() {
                $ocLazyLoad.load( {
                    name: 'ui.ace'
                } ).then( function() {
                    ace.config.set( 'packaged', true );
                    ace.config.setModuleUrl( 'ace/theme/eclipse', require( 'file-loader!ace-builds/theme-eclipse.js' ) );
                    ace.config.setModuleUrl( 'ace/theme/monokai', require( 'file-loader!ace-builds/theme-monokai.js' ) );
                    ace.config.setModuleUrl( 'ace/mode/xml', require( 'file-loader!ace-builds/mode-xml.js' ) );
                    ace.config.setModuleUrl( 'ace/snippets/xml', require( 'file-loader!ace-builds/snippets/xml.js' ) );
                    ace.config.setModuleUrl( 'ace/snippets/text', require( 'file-loader!ace-builds/snippets/text.js' ) );
                    ace.config.setModuleUrl( 'ace/mode/xml_worker', require( 'file-loader!ace-builds/worker-xml.js' ) );
                    $scope.uiAceLoaded = true;
                } );
            } );
        } );
        // Header panel requirements
        _initBreadcumbModel( $scope, $state, soaSvc, contributionService );
        xrtContextService.getXrtData( $state.params ).then( function( data ) {
            $scope.selectedPrefScope = data;

            $scope.userSession = viewModelObjectService
                .createViewModelObject( clientDataModel.getUserSession().uid );
            $scope.user = viewModelObjectService.createViewModelObject( clientDataModel.getUser().uid );
            $scope.propertyNames = [];
            $scope.oneStepCommands = commandsService.getCommands( $scope,
                'com.siemens.splm.clientfx.ui.oneStepCommands' );

            $scope.setupNewEditorPage( data, xrtDOMService, clientMetaModel );

            // $scope.setBreadcrumbsFromStylesheetContext(
            // $scope.stylesheetContext );

            $scope.preferenceName = $scope.getPreferenceNameFromStylesheetContext( $scope.stylesheetContext );
        } );

        appCtxService.registerCtx( 'XRTEditor.edit', {
            editing: false
        } );

        $scope.$on( '$destroy', function() {
            appCtxService.unRegisterCtx();
        } );

        $scope.baseUrlPath = app.getBaseUrlPath();

        $scope.$watch( 'detailsData', function( newVal, oldVal ) {
            if( newVal !== oldVal && $scope.matchedNode.editorLineNumber === $scope.oldSelectedLineNumber ) {
                $scope.textEditorNodeUpdate( newVal );
            }

            if( $scope.editor ) {
                $scope.oldSelectedLineNumber = $scope.editor.getSelectionRange().start.row;
            }
        }, true );

        $scope.fullScreen = false;

        $scope.headerProperties = [];

        $scope.dataForTheTree = [];
        $scope.selectedNode = {};
        $scope.previousSelectedNode = {};
        $scope.selectedNode.selected = false;
        $scope.previousSelectedNode.selected = false;

        $scope.resetSelection = function() {
            for( var i = 0; i < $scope.lineNodeArray.length; i++ ) {
                $scope.lineNodeArray[ i ].selected = false;
            }
        };

        // Searches through the tree recursively to find the selected
        // node
        $scope.updateSelection = function( xrtNode ) {
            var lineNumber = xrtNode.editorLineNumber;
            if( lineNumber !== xrtNode.currentRowSelected && $scope.editor ) {
                var Range = ace.require( 'ace/range' ).Range;
                $scope.editor.selection.setRange( new Range( lineNumber,
                    $scope.editor.session.getLine( lineNumber ).length, lineNumber, $scope.editor.session
                    .getLine( lineNumber ).length ) );
                $scope.editor.scrollToLine( lineNumber );
                // update the grid binding data
                $scope.detailsData = xrtNode.attributes;
                $scope.$evalAsync();
            }
        };

        $scope.$on( 'NodeSelectionEvent', function( event, data ) {
            $scope.updateSelection( data.node, !data.node.selection );
        } );

        $scope.textEditorNodeUpdate = function() {
            var lineNumber = $scope.matchedNode.editorLineNumber;
            var newNodeString = $scope.parseNodeToXML( $scope.matchedNode );
            var Range = ace.require( 'ace/range' ).Range;
            $scope.editor.selection.setRange( new Range( lineNumber,
                $scope.editor.session.getLine( lineNumber ).length, lineNumber, $scope.editor.session
                .getLine( lineNumber ).length ) );
            var colStart = $scope.editor.session.getLine( lineNumber ).match( /^(\s*)/ )[ 0 ].length;
            var colEnd = $scope.editor.session.getLine( lineNumber ).length;
            $scope.editor.selection.setRange( new Range( lineNumber, colStart, lineNumber, colEnd ) );
            $scope.editor.session.replace( $scope.editor.selection.getRange(), newNodeString );
            $timeout( function() {
                //$scope.aceModel = $scope.editor.session.getValue();
                //$scope.refreshTree();
            }, 0 );
        };

        // Converts a single node to an XML String, returns the string
        $scope.parseNodeToXML = function( xrtNode ) {
            var xmlString = '<';
            xmlString += xrtNode.type;

            for( var i = 0; i < xrtNode.attributes.length; i++ ) {
                if( xrtNode.attributes[ i ].value ) {
                    xmlString = xmlString + ' ' + xrtNode.attributes[ i ].name + '="' + xrtNode.attributes[ i ].value +
                        '"';
                }
            }

            if( $scope.arrayString[ xrtNode.editorLineNumber ].indexOf( '/>' ) !== -1 ) {
                xmlString += ' />';
            } else {
                xmlString += ' >';
            }

            return xmlString;
        };

        // Removes the node from the node tree, updating the editor
        // based on the changes
        $scope.removeNodeClick = function( xrtNode ) {
            xrtNode.parentNode.children.splice( xrtNode.parentNode.children.indexOf( xrtNode ), 1 );
            $scope.updateXMLFromTree();
        };

        panelContentService.getViewModelById( 'xrtEditorTable' ).then( function( response ) {
            viewModelService.populateViewModelPropertiesFromJson( response.viewModel ).then( function( declViewModel ) {
                viewModelService.setupLifeCycle( $scope, declViewModel );
                $scope.data = declViewModel;
                $scope.tableViewModelLoaded = true;
            } );
        } );

        // Editor Stuff
        $scope.aceLoaded = function( _editor ) {
            _editor.setReadOnly( true );

            $scope.editor = _editor;

            $scope.editor.$blockScrolling = Infinity;
            aceEditorUtils.loadEditor( $scope.editor );

            _editor.getSession().setMode( 'ace/mode/xml' );
            _editor.getSession().setUseWrapMode( true );

            _editor.setTheme( 'ace/theme/eclipse' );

            _editor.session.selection.on( 'changeCursor', function() {
                // Nothing to do
            } );

            _editor.commands.addCommand( {
                name: 'Save',
                bindKey: {
                    win: 'Ctrl-S',
                    mac: 'Command-S'
                },
                exec: function() {
                    // TODO initiate save!
                    // notifySvc.info( "XRT saved" );
                    if( $scope.editing ) {
                        $scope.oneStepCommands[ 'Save Edits' ].handler.execute();
                    }
                },
                readOnly: true
            } );

            aceEditorUtils.loadEditor( _editor );
            // $scope.setXML( $scope.initialModel );

            // Scroll to selected node in tree
            $scope.scrollToSelectedNode = function() {
                if( $( '.aw-state-selected' )[ 0 ] ) {
                    var nodeOffsetDelta = $( '.aw-state-selected' )[ 0 ].offsetTop -
                        $( '.aw-layout-outline' )[ 0 ].offsetTop;
                    var scrollTop = $( '.aw-layout-outline' )[ 0 ].scrollTop;
                    var scrollPadding = 100;
                    if( nodeOffsetDelta > scrollTop + $( '.aw-layout-outline' )[ 0 ].clientHeight ) {
                        $( $( '.aw-layout-outline' )[ 0 ] ).scrollTop( nodeOffsetDelta + scrollPadding );
                    }
                    if( nodeOffsetDelta < $( '.aw-layout-outline' )[ 0 ].scrollTop ) {
                        $( $( '.aw-layout-outline' )[ 0 ] ).scrollTop( nodeOffsetDelta - scrollPadding );
                    }
                }
            };

            //Actions to be performed when editor selection changes.
            $scope.editor.on( 'changeSelection', function() {
                $scope.currentRowSelected = $scope.editor.getSelectionRange().start.row;
                $scope.selectEditorXmlNode( $scope.currentRowSelected );
                $scope.changeSelection();
            } );

            $scope.changeSelection = function() {
                $scope.newSelection = true;
                if( $scope.editor.getSelectionRange().start.row !== $scope.lastSelectedRow ) {
                    $scope.lastSelectedRow = $scope.editor.getSelectionRange().start.row;
                    $scope.resetSelection();
                    if( $scope.matchedNode && !$scope.nodeSelection ) {
                        $scope.nodeSelection = true;
                        $scope.$evalAsync( function() {
                            if( $scope.selectedNode ) {
                                $scope.previousSelectedNode = $scope.selectedNode;
                                $scope.previousSelectedNode.selected = false;
                                $scope.selectedNode = $scope.matchedNode;
                                $scope.selectedNode.selected = true;
                            }
                            // update the grid binding data
                            $scope.detailsData = $scope.matchedNode.attributes;
                            eventBus.publish( 'details.plTable.reload' );
                            xrtDOMService.setEditing( $scope.editing );
                            // Scroll to selected node in the tree
                            $timeout( function() {
                                $scope.nodeSelection = false;
                                $scope.scrollToSelectedNode( $( '.aw-state-selected' )[ 0 ] );
                            }, 0 );
                        } );
                    }
                }
            };

            // Updates tree based on XRT changes if XRT is valid and
            $scope.editor.on( 'blur', function() {
                if( !$scope.editor.session.$annotation || $scope.editor.session.$annotations.length === 0 &&
                    $scope.editing ) {
                    $scope.aceModel = $scope.editor.session.getValue();
                    $scope.refreshTree();
                    $timeout( function() {
                        $scope.matchedNode = $scope.lineNodeArray[ $scope.currentRowSelected ];
                        $scope.changeSelection();
                        if( $scope.matchedNode ) {
                            $scope.updateSelection( $scope.matchedNode, !$scope.matchedNode.selection );
                            eventBus.publish( 'details.plTable.reload' );
                            $scope.scrollToSelectedNode( $( '.aw-state-selected' )[ 0 ] );
                        }
                    }, 0 );
                }
            } );

            $scope.refreshTree = function() {
                if( ( !$scope.editor.session.$annotations || $scope.editor.session.$annotations.length === 0 ) &&
                    $scope.editing ) {
                    $scope.dataForTheTree[ 0 ] = xrtDOMService.parseXRT( $scope.aceModel );
                    $scope.arrayString = $scope.aceModel.split( '\n' );
                    $scope.scanDocument( $scope.dataForTheTree[ 0 ], 0 );
                }
            };
        };

        $scope.selectEditorXmlNode = function( lineNo ) {
            $scope.matchedNode = $scope.lineNodeArray[ lineNo ];
            if( $scope.matchedNode ) {
                $scope.openParents( $scope.matchedNode );
            }
        };

        // Recursively opens all parents of the given node
        $scope.openParents = function( xmlNode ) {
            // If xmlNode has a parentNode, then recursively open it too
            if( xmlNode.parentNode ) {
                xmlNode.parentNode.expanded = true;
                $scope.openParents( xmlNode.parentNode );
            }
        };

        // One-time function that is used to preset the tree, should not
        // be used in any other case.
        // All operations should be performed on the tree after the
        // initial load.
        $scope.setXML = function( xmlStr ) {
            $scope.aceModel = $scope.formatXml( xmlStr );
            // $scope.aceModel = $.parseXML(xmlStr);
            $scope.dataForTheTree = [];
            $scope.dataForTheTree.push( xrtDOMService.parseXRT( $scope.aceModel ) );
            $scope.arrayString = $scope.aceModel.split( '\n' );
            $scope.scanDocument( $scope.dataForTheTree[ 0 ], 0 );
        };

        $scope.formatXml = function( xml ) {
            var formatted = '';
            var regexSpaceTab = /(>) (<)|(>)\t(<)/g;
            var regexTags = /(>)(<)(\/*)/g;
            // Remove any spaces, line breaks or tabs in the XML between tags.
            xml = xml.replace( regexSpaceTab, '><' );
            // Add a line break / carraige return
            xml = xml.replace( regexTags, '$1\r\n$2$3' );
            var pad = 0;
            $.each( xml.split( '\r\n' ), function( index, node ) {
                var indent = 0;
                if( node.match( /.+<\/\w[^>]*>$/ ) ) {
                    indent = 0;
                } else if( node.match( /^<\/\w/ ) ) {
                    if( pad !== 0 ) {
                        pad -= 1;
                    }
                } else if( node.match( /^<\w[^>]*[^/]>.*$/ ) ) {
                    indent = 1;
                } else {
                    indent = 0;
                }

                var padding = '';
                for( var i = 0; i < pad; i++ ) {
                    padding += '  ';
                }

                formatted += padding + node + '\r\n';
                pad += indent;
            } );

            return formatted;
        };

        // Recursive method to update array string based passed Node and
        // its children
        $scope.getXMLStringFromTree = function( xmlNode ) {
            $scope.updatedXMLString = $scope.updatedXMLString + '<' + xmlNode.type;
            for( var ii = 0; ii < xmlNode.attributes.length; ii++ ) {
                if( xmlNode.attributes[ ii ].value ) {
                    $scope.updatedXMLString = $scope.updatedXMLString + ' ' + xmlNode.attributes[ ii ].name + '=' +
                        '"' + xmlNode.attributes[ ii ].value + '"';
                }
            }

            if( xmlNode.children.length === 0 ) {
                $scope.updatedXMLString += '/>';
            } else {
                $scope.updatedXMLString += '>';
                for( var j = 0; j < xmlNode.children.length; j++ ) {
                    $scope.getXMLStringFromTree( xmlNode.children[ j ] );
                }
                $scope.updatedXMLString = $scope.updatedXMLString + '</' + xmlNode.type + '>';
            }
        };

        // The method that should be called to perform any changes,
        // updates editor based on tree
        $scope.updateXMLFromTree = function() {
            $scope.updatedXMLString = '';

            // TODO: Find a way to preserve comments
            $scope.updatedXMLString = '<?xml version="1.0" encoding="UTF-8"?>';
            $scope.getXMLStringFromTree( $scope.dataForTheTree[ 0 ] );

            // $scope.aceModel = pd.xml( $scope.updatedXMLString );
            $scope.arrayString = $scope.aceModel.split( '\n' );
            $scope.scanDocument( $scope.dataForTheTree[ 0 ], 0 );
        };

        // Recursive routine to stamp nodes with corresponding editor
        // line numbers
        $scope.scanDocument = function( xmlNode, lineNo ) {
            if( lineNo === 0 ) {
                $scope.lineNodeArray = [];
            }
            if( lineNo === $scope.currentRowSelected ) {
                $scope.previousSelectedNode.selected = false;
                xmlNode.selected = true;
            }
            while( lineNo < $scope.arrayString.length ) {
                $scope.lineNodeArray[ lineNo ] = xmlNode;
                if( $scope.arrayString[ lineNo ].indexOf( '<' + xmlNode.type ) > -1 ) {
                    xmlNode.editorLineNumber = lineNo;
                    $scope.lineNodeArray[ lineNo ] = xmlNode;
                    lineNo++;
                    if( xmlNode.children !== null ) {
                        for( var i = 0; i < xmlNode.children.length; i++ ) {
                            if( !xmlNode.children[ i ].parentNode ) {
                                xmlNode.children[ i ].parentNode = xmlNode;
                            }
                            lineNo = $scope.scanDocument( xmlNode.children[ i ], lineNo );
                        }
                    }
                    break;
                }
                lineNo++;
            }
            return lineNo;
        };

        /**
         * Global toolbar requirements
         */

        /**
         * Change browser location to be the 'gateway'.
         *
         * @memberof angular_module.myApp_prefui.PreferenceCtrl
         */
        $scope.gotoGateway = function() {
            $location.path( '/gateway' );
        };

        /**
         * Location requirements
         */
        $scope.locationTitle = 'XRTEditor';
        $scope.locationPages = [ {
            pageId: 0,
            pageIndex: 0,
            selectedTab: true,
            displayTab: true,
            classValue: 'aw-base-tabTitle',
            title: '',
            name: '',
            visible: true,
            navigation: true,
            xrtProps: [],
            columns: []
        } ];

        // Could add a page to allow for defining new preferences not
        // just overwriting old ones - use setPreferencesDefinition soa

        $scope.activePage = null;
        $scope.editing = false; // Could probably replace
        // $scope.editMode with this to connect
        // to the start edit button
        $scope.pages = [];

        $scope.status = {
            isopen: false
        };

        /**
         * Callback from the tabs when the selected tab changes Used by location tabs
         *
         * @memberof angular_module.myApp_summaryui.SummaryCtrl
         *
         * @param {String} pageId - the ID of the tab page to be made active.
         */
        $scope.api = function( pageId ) {
            for( var i = 0; i < $scope.locationPages.length; i++ ) {
                if( $scope.locationPages[ i ].pageId === pageId ) {
                    $scope.activeLocationPage = $scope.locationPages[ i ];
                    if( $scope.activeLocationPage && !$scope.activeLocationPage.navigationPage ) {
                        $scope.activePage = $scope.activeLocationPage;
                    }
                }
            }
            // console.log('PageId is ' + pageId + ' Name is ' + name);
        };

        // When the query parameters change notify the presenter
        $scope.$on( '$locationChangeSuccess', function() {
            xrtContextService.getXrtData( $state.params ).then( function( data ) {
                $scope.setupNewEditorPage( data, xrtDOMService, clientMetaModel );
            } );
        } );

        /**
         * Whether the edit input is visible
         *
         * @memberof angular_module.myApp_prefui.PreferenceCtrl
         */
        $scope.editMode = false;

        /**
         * Setup to listen to get stylesheet events.
         */
        localStrg.subscribe( 'getStyleSheet', function( event ) {
            var stylesheetContext = JSON.parse( event.newValue );
            updateContext( stylesheetContext );
        } );

        var updateContext = _.debounce( function( stylesheetContext ) {
            $scope.$evalAsync( function() {
                if( stylesheetContext ) {
                    var params = {
                        subLocation: '',
                        location: ''
                    };

                    params.prefLocation = stylesheetContext.preferenceLocation;

                    params.client = stylesheetContext.client;

                    params.objectType = stylesheetContext.type;

                    params.xrtType = stylesheetContext.stylesheetType;

                    if( stylesheetContext.location ) {
                        params.location = stylesheetContext.location;

                        if( stylesheetContext.sublocation ) {
                            params.subLocation = stylesheetContext.sublocation;
                        }
                    }

                    $state.go( 'xrtEditor', params );
                    //
                    // console.log($state.params);
                    // logger.info( 'newPath:' + newPath );

                    // $location.path( newPath );
                    // $location.replace();
                }
            } );
        }, 250, {
            trailing: true
        } );

        /**
         * Setup to listen to get decl stylesheet events. Context information is not included currently so it has to be loaded by separate SOA call.
         */
        localStrg.subscribe( 'getDeclStyleSheet', function( event ) {
            var stylesheetContext = JSON.parse( event.newValue );
            soaSvc.post( 'Internal-AWS2-2016-03-DataManagement', 'getStyleSheet2', {
                processEntireXRT: false,
                input: [ {
                    businessObject: stylesheetContext.modelObject,
                    businessObjectType: stylesheetContext.objectType,
                    styleSheetType: stylesheetContext.styleSheetType || 'SUMMARY',
                    clientContext: stylesheetContext.clientContext
                } ]
            } ).then( function( response ) {
                updateContext( response.output[ 0 ].context );
            } );
        } );

        $scope.updateStylesheet = function() {
            var params = {};

            params.prefLocation = $scope.selectedPreferenceLocation.id;

            params.client = $scope.selectedClient.id;

            params.objectType = $scope.selectedType.id;

            params.xrtType = $scope.selectedStylesheetType.id;

            if( params.xrtType === 'SUMMARY' && params.client === 'AWC' ) {
                if( $scope.selectedLocation && $scope.selectedLocation.id ) {
                    params.location = $scope.selectedLocation.id;

                    if( $scope.selectedSubLocation.id ) {
                        params.sublocation = $scope.selectedSubLocation.id;
                    }
                }
            }

            xrtContextService.getXrtData( params ).then( function( data ) {
                $scope.setupNewEditorPage( data, xrtDOMService, clientMetaModel );
            } );
        };
    }
] );
