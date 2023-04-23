// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwyg-canvas.service
 */
import app from 'app';
import wygVMEditUtilsSvc from 'js/wysiwyg-view-editorUtils.service';
import wysiwygLoadAndSaveService from 'js/wysiwygLoadAndSaveService';
import wysiwygXmlParserService from 'js/wysiwygXmlParserService';
import appCtxService from 'js/appCtxService';
import wysiwygUtilService from 'js/wysiwygUtilService';
import _ from 'lodash';
import Debug from 'Debug';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

var canvasConfigurations;

var counterObj = {};

var trace = new Debug( 'wysiwygCanvasService' );

const WYS_LAYOUT_TEMPLATE_CLASS = 'wys-canvas-layoutTemplate';
const WYS_WIDGET_WRAPPER = 'wys-widget-wrapper';
const WYS_ALIEN_WIDGET_CLASS = 'wys-alien-widgetLayout';
const WYS_ALIEN_ELEMENT_DONT_COMPILE = 'ng-non-bindable';
const WYS_NESTED_WIDGET_CLASS = 'wys-nested-widgetLayout';

// The regular expression to filter non-void HTML tags
const rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi;

export let isWysiwygCanvasMode = function() {
    var state = appCtxService.getCtx( 'wysiwyg.state' );
    return state && state.current.name === 'wysiwygCanvas';
};

export let serializeToString = function( htmlModel ) {
    // jquery3.5.0 and higher version upgrade doesn't support non-void self-closing tags, replace them to dedicated close tags
    // example: <div/> will be converted to <div></div>
    return new XMLSerializer().serializeToString( htmlModel ).replace( rxhtmlTag, '<$1></$2>' );
};

var setDroppedElementData = function( inputData ) {
    wysiwygUtilService.setDroppedElementId( inputData.viewDocument.childNodes[ 0 ].getAttribute( 'id' ) );
    if( inputData.viewDocument.childNodes[ 0 ].nodeName !== 'wys-widget-wrapper' ) {
        wysiwygUtilService.setDroppedElementType( 'LayoutElement' );
    } else {
        wysiwygUtilService.setDroppedElementType( 'buildingBlockElement' );
    }
};

/**
 * Updates the Html-Model (i.e. View with id and CSS for Canvas) and View-XML(Plain View used by Editors)
 * @param {*} canvasModel current Model
 * @param {*} id of the parent div in Html-Model
 * @param {*} inputData View snippet to append in both View-XML(Plain View used by Editors)  using Html-Model (i.e. View with id and CSS for Canvas)
 * @param {*} operation [ADD, REMOVE, EDIT]
 */
export let updateCanvasModel = function( canvasModel, id, inputData, operation ) {
    try {
        if( canvasModel && id ) {
            var destinationNode = wysiwygXmlParserService.getElementById( canvasModel, id );
            if( !destinationNode ) {
                throw new Error( 'input id does not exist' );
            }
            if( operation === 'ADD' ) {
                var classListAttr = destinationNode.getAttribute( 'class' );
                var classList = classListAttr ? classListAttr.split( ' ' ) : [];
               setDroppedElementData( inputData );
                var isLayoutElem = classList.includes( WYS_LAYOUT_TEMPLATE_CLASS );
                if( isLayoutElem ) {
                    destinationNode.appendChild( inputData.viewDocument.childNodes[ 0 ] );
                } else {
                    var wrapperNode = $( destinationNode ).closest( WYS_WIDGET_WRAPPER )[ 0 ];
                    wrapperNode.parentNode.insertBefore( inputData.viewDocument.childNodes[ 0 ], wrapperNode );
                }
            } else if( operation === 'REMOVE' ) {
                destinationNode.parentNode.removeChild( destinationNode );
            } else if( operation === 'EDIT' ) {
                destinationNode.setAttribute( inputData.attrName, inputData.attrValue );
            }
        }
    } catch ( e ) {
        trace( 'updateCanvasModel : Canvas Model Cannot be updated' );
    }
};

/**
 *
 * @param {*} currentTarget
 */
export let getCurrentTarget = function( currentTarget ) {
    var idRegex = /^(wys-).+$/g;
    var currentTargetid = $( currentTarget ).attr( 'id' );
    if( !currentTarget || $( currentTarget ).length === 0 ) {
        return null;
    }
    if( idRegex.test( currentTargetid ) || currentTargetid === 'root' ) {
        return $( currentTarget ).attr( 'id' );
    }
    return exports.getCurrentTarget( $( currentTarget ).children() );
};

export let generateAndAssignId = function( viewDocument ) {
    _.forEach( viewDocument.childNodes, function traverseAndassign( node ) {
        if( node.nodeType === 1 || node.nodeType === 2 ) {
            node.setAttribute( 'id', 'wys-' + exports.getRandomInt() );
        }
        if( node.childNodes && node.childNodes.length > 0 ) {
            _.forEach( node.childNodes, traverseAndassign );
        }
    } );
    return viewDocument;
};

export let getRandomInt = function() {
    var max = 10000;
    return Math.floor( Math.random() * Math.floor( max ) );
};

export let processDelete = function( canvasData ) {
    var postProcessing = function() {
        canvasData.viewModel = wygVMEditUtilsSvc.generateViewModel(
            wygVMEditUtilsSvc.createHTMLModel( serializeToString( canvasData.canvasModel ) ),
            canvasData.viewModel );
        var serializedHTML = exports.convertToViewXML( canvasData.canvasModel );
        wysiwygLoadAndSaveService.updateViewAndViewModel( serializedHTML, canvasData.viewModel );

        eventBus.publish( 'wysiwyg.reloadWysiwygEditor' );
        eventBus.publish( 'wysiwyg.refreshNestedView' );
    };
    var targetCanvasElement = wysiwygXmlParserService.getElementById( canvasData.canvasModel, canvasData.currentSelectedElementId );
    if( targetCanvasElement ) {
        canvasConfigurations = appCtxService.getCtx( 'wysiwyg.canvas.configurations' );
        exports.updateCanvasModel( canvasData.canvasModel, canvasData.currentSelectedElementId, null, 'REMOVE' );
        postProcessing();
        return true;
    }
    return false;
};
/**
 *
 * @param {*} ev
 * @param {*} canvasData
 */
export let processCanvasDrop = function( ev, canvasData ) {
    var dropData = JSON.parse( ev.originalEvent.dataTransfer.getData( 'text' ) );

    var parseAndUpdate = function( viewXML ) {
        var viewDocument = new DOMParser().parseFromString( viewXML, 'text/xml' );

        //Convert to canvas model for the particular element before assigning id
        exports.convertToCanvasModel( viewDocument );

        var inputData = {
            viewDocument: exports.generateAndAssignId( viewDocument )
        };
        var id = exports.getCurrentTarget( ev.currentTarget );

        if( id && canvasData.canvasModel instanceof Document ) {
            exports.updateCanvasModel( canvasData.canvasModel, id, inputData, 'ADD' );
        } else {
            canvasData.canvasModel = inputData.viewDocument;
            setDroppedElementData( inputData );
        }
    };

    var postProcessing = function() {
        canvasData.viewModel = wygVMEditUtilsSvc.generateViewModel(
            wygVMEditUtilsSvc.createHTMLModel( serializeToString( canvasData.canvasModel ) ),
            canvasData.viewModel );
        var serializedHTML = exports.convertToViewXML( canvasData.canvasModel );
        wysiwygLoadAndSaveService.updateViewAndViewModel( serializedHTML, canvasData.viewModel );

        eventBus.publish( 'refreshWysiwygCanvas', canvasData );
    };

    if( dropData.isReorder ) {
        var draggedEleWrapper = wysiwygXmlParserService.getElementById( canvasData.canvasModel, dropData.draggedEleId );
        var destinatonNodeId = exports.getCurrentTarget( ev.currentTarget );
        var destinationNode = wysiwygXmlParserService.getElementById( canvasData.canvasModel, destinatonNodeId );

        var classListAttr = ev.currentTarget.getAttribute( 'class' );
        var classList = classListAttr ? classListAttr.split( ' ' ) : [];
        if( classList.includes( WYS_LAYOUT_TEMPLATE_CLASS ) ) {
            destinationNode.appendChild( draggedEleWrapper );
        } else {
            var wrapperNode = $( destinationNode ).closest( WYS_WIDGET_WRAPPER )[ 0 ];
            wrapperNode.parentNode.insertBefore( draggedEleWrapper, wrapperNode );
        }

        wysiwygUtilService.setDroppedElementId( dropData.draggedEleId );
        wysiwygUtilService.setDroppedElementType( 'buildingBlockElement' );
        postProcessing();
    } else {
        var dropXML = dropData.template.trim();
        var currentPanelName = wysiwygLoadAndSaveService.getCurrentPanelId();
        if( dropXML && dropXML.indexOf( '@inr' ) !== -1 ) {
            var widgetName = dropData.name;
            var counter = 1;
            if( !counterObj[ currentPanelName ] ) {
                counterObj[ currentPanelName ] = {};
            }
            if( widgetName && counterObj[ currentPanelName ][ widgetName ] ) {
                counter = counterObj[ currentPanelName ][ widgetName ];
                counter++;
                counterObj[ currentPanelName ][ widgetName ] = counter;
            } else if( widgetName && !counterObj[ currentPanelName ][ widgetName ] ) {
                counterObj[ currentPanelName ][ widgetName ] = 1;
            }
            dropXML = dropXML.replace( /@inr/g, counter );
        }
        if( dropXML && dropXML.indexOf( '|' ) > 0 ) {
            var viewXMLs = dropXML.split( '|' );
            _.forEach( viewXMLs, function( XML ) {
                parseAndUpdate( XML );
            } );
        } else {
            parseAndUpdate( dropXML );
        }

        postProcessing();
    }
};

/**
 * This function converts the View-XML(Plain View used by Editors) to Html-Model (i.e. View with id and CSS for Canvas)
 * It wraps every widgets with an extra wrapper-widget which holds all the css classes and ids.
 *
 * @param {*} viewXML (i.e. Plain View used by Editors)
 */
export let convertToCanvasModel = function( viewDoc ) {
    canvasConfigurations = appCtxService.getCtx( 'wysiwyg.canvas.configurations' );
    var layoutElements = canvasConfigurations.layoutElements;
    var containerElementsAsWidget = canvasConfigurations.containerElementsAsWidget;
    var nestedElemntObjs = canvasConfigurations.nestedViewElements;
    var nestedElements = new Map();
    nestedElemntObjs.forEach( function( element ) {
        nestedElements.set( element.name, element.attr );
    } );
    var supportedElements = [];
    var widgetsData = appCtxService.getCtx( 'wysiwyg.widgets.configurations' ).data;
    widgetsData.forEach( function( element ) {
        supportedElements.push( element.name );
    } );
    supportedElements = supportedElements.concat( canvasConfigurations.additionalSupportedElements );
    if( viewDoc.childNodes && viewDoc.childNodes.length > 0 ) {
        _.forEach( viewDoc.childNodes, function traverse( node ) {
            var nodeType = node.nodeType;
            var ignoredNode = nodeType === 3 || nodeType === 8;
            var nodeName = node.nodeName.toLowerCase();
            var isDummyRootNode = !ignoredNode ? node.getAttribute( 'class' ) : '';
            if( !ignoredNode && isDummyRootNode !== 'wys-dummy-root aw-layout-column' ) {
                if( layoutElements.includes( nodeName ) ) {
                    if( node.getAttribute( 'class' ) ) {
                        node.setAttribute( 'class', node.getAttribute( 'class' ) + ' ' + WYS_LAYOUT_TEMPLATE_CLASS );
                    } else {
                        node.setAttribute( 'class', WYS_LAYOUT_TEMPLATE_CLASS );
                    }

                    if( containerElementsAsWidget.includes( nodeName ) ) {
                        node.setAttribute( 'class', node.getAttribute( 'class' ) + ' ' + 'wys-canvas-layoutElementAsWidget' );
                    }
                } else {
                    var parent = node.parentNode;
                    var wrapper = document.createElement( WYS_WIDGET_WRAPPER );
                    var checkHyphen = /[-]/;
                    wrapper.setAttribute( 'wrapped-widget-name', nodeName );
                    if( parent !== null ) {
                        parent.replaceChild( wrapper, node );
                        if( nestedElements.has( nodeName ) ) {
                            wrapper.setAttribute( 'wrapped-widget-view', node.getAttribute( nestedElements.get( nodeName ) ) );
                            wrapper.setAttribute( 'class', WYS_NESTED_WIDGET_CLASS );
                        } else if( !supportedElements.includes( nodeName ) && checkHyphen.test( nodeName ) ) {
                            // if node element is not supported in panel builder, apply some specific classes and don't compile alien element.
                            if( node.getAttribute( 'class' ) ) {
                                var classList = node.getAttribute( 'class' );
                                if( !classList.includes( WYS_ALIEN_ELEMENT_DONT_COMPILE ) ) {
                                    node.setAttribute( 'class', node.getAttribute( 'class' ) + ' ' + WYS_ALIEN_ELEMENT_DONT_COMPILE );
                                }
                            } else {
                                node.setAttribute( 'class', WYS_ALIEN_ELEMENT_DONT_COMPILE );
                            }
                            wrapper.setAttribute( 'class', WYS_ALIEN_WIDGET_CLASS );
                        }
                    }
                    wrapper.appendChild( node );
                }
            }
            if( !node.className || node.className.indexOf( WYS_ALIEN_ELEMENT_DONT_COMPILE ) === -1 ) {
                _.forEach( node.childNodes, traverse );
            }
        } );
    }
    return viewDoc;
};

/**
 *  Given an un-sanitized HTML model ( html document), it santizes it and convert back to string.
 */
export let convertToViewXML = function( htmlModel ) {
    var sanitizedHTMLModel = exports.santizeHTMLModel( htmlModel );
    var sanitizedHTMLString = serializeToString( sanitizedHTMLModel );
    var wysRootWrapper = '<wys-root class=\"wys-dummy-root aw-layout-column\">';
    // check if wys root wrapper is present, remove it.
    if( sanitizedHTMLString.startsWith( wysRootWrapper ) ) {
        sanitizedHTMLString = sanitizedHTMLString.substring( wysRootWrapper.length, sanitizedHTMLString.length - '</wys-root>'.length );
    }
    return sanitizedHTMLString;
};

/**
 * This function converts the Html-Model (i.e. View with id and CSS for Canvas) to View-XML(Plain View used by Editors)
 * i.e. it removes all the css classes and ids.
 * It also recognizes the the extra wrapper-widget  wrapped around widgets and removes them.
 *
 * @param {*} htmlModel (i.e. View with id and CSS for Canvas)
 */
export let santizeHTMLModel = function( htmlModel ) {
    var convertedViewXML = new DOMParser().parseFromString( '<div class=\'toBeDeleted\'></div>', 'text/xml' );
    var nodeArray = [ convertedViewXML.childNodes[ 0 ] ];
    var nodeAppended = [ true ];

    var appendNode = function( node ) {
        nodeArray[ 0 ].appendChild( node );
        nodeArray.unshift( node );
        nodeAppended.unshift( true );
    };

    var classNames = [ WYS_LAYOUT_TEMPLATE_CLASS, WYS_ALIEN_ELEMENT_DONT_COMPILE ];
    if( htmlModel.childNodes && htmlModel.childNodes.length > 0 ) {
        _.forEach( htmlModel.childNodes, function traverse( node ) {
            var clonnedNode = node.cloneNode();
            var nodeType = clonnedNode.nodeType;
            var isTextNode = nodeType === 3;
            var commentNode = nodeType === 8;
            var nodeName = clonnedNode.nodeName.toLowerCase();

            if( isTextNode ) {
                var textContent = clonnedNode.textContent ? clonnedNode.textContent.trim() : '';
                var needToInclude = textContent && textContent.length > 0;
                if( needToInclude ) {
                    nodeArray[ 0 ].appendChild( clonnedNode );
                    nodeArray.unshift( clonnedNode );
                }
                nodeAppended.unshift( needToInclude );
            } else if( commentNode ) {
                appendNode( clonnedNode );
            } else {
                var regex = /^(wys-).+(-wrapper)$/g;
                if( !regex.test( nodeName ) ) {
                    var classes = clonnedNode.getAttribute( 'class' );
                    if( classes ) {
                        classes = classes.split( ' ' );
                        var userClasses = _.difference( classes, classNames );
                        if( userClasses && userClasses.length > 0 ) {
                            clonnedNode.setAttribute( 'class', userClasses.join( ' ' ) );
                        } else {
                            clonnedNode.removeAttribute( 'class' );
                        }
                    }
                    var id = clonnedNode.getAttribute( 'id' );
                    var idRegex = /^(wys-).+$/g;
                    if( id && idRegex.test( id ) ) {
                        clonnedNode.removeAttribute( 'id' );
                    }
                    appendNode( clonnedNode );
                } else {
                    nodeAppended.unshift( false );
                }
            }
            _.forEach( node.childNodes, traverse );
            if( nodeAppended[ 0 ] ) {
                nodeArray.shift();
            }
            nodeAppended.shift();
        } );
    }

    if( $( convertedViewXML ).find( '.toBeDeleted' ).children().length > 0 ) {
        $( convertedViewXML ).find( '.toBeDeleted' ).children().unwrap();
    } else {
        $( convertedViewXML ).find( '.toBeDeleted' ).remove();
    }

    return convertedViewXML;
};

export let updateConfig = function( data ) {
    eventBus.publish( 'aw.canvas.configuration', data );
};

export let setConfig = function( data ) {
    var configData = wysiwygUtilService.getLayoutConfigData();
    if( configData ) {
        data.widthRadio.dbValue = configData.width;
        data.heightRadio.dbValue = configData.height;
        data.layout.dbValue = configData.layoutConfiguration;
        data.widthRadio.uiValue = data.widthRadio.dbValue === true ? 'Standard' : 'Wide';
        if( data.heightRadio.dbValue === 'def' ) {
            data.heightRadio.uiValue = 'Default';
        } else {
            data.heightRadio.uiValue = data.heightRadio.dbValue === 'large' ? 'Large' : 'Full';
        }

        data.layout.uiValue = data.layout.dbValue === 'cp' ? 'Command Panel' : 'Panel Layout';
        eventBus.publish( 'aw.canvas.configuration', data );
    }
    return { data: { isSetConfigCompleted: true } };
};

exports = {
    isWysiwygCanvasMode,
    serializeToString,
    updateCanvasModel,
    getCurrentTarget,
    generateAndAssignId,
    getRandomInt,
    processDelete,
    processCanvasDrop,
    convertToCanvasModel,
    convertToViewXML,
    santizeHTMLModel,
    updateConfig,
    setConfig
};
export default exports;
app.factory( 'wygCanvasSvc', () => exports );
