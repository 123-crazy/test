// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module define editPropertyService
 *
 * @module js/editPropertyService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import internalGraphUtils from 'js/internalGraphUtils';
import logSvc from 'js/logger';
import dfCommands from 'js/diagramFoundationCommands';

var exports = {};

/**
 * @constructor
 *
 * @class
 * @param {Object} graphModel - the graph model object
 * @param {Object} diagramView - diagram view object
 */
export let PropertyEditHandler = function( graphModel, diagramView ) {
    var self = this;
    var editingDomElement = null;
    var originalValue = null;
    var cachedDeferred = null;
    self.editingPropertyName = null;

    /**
     * Show edit box on a node to start editing the property
     *
     * @param {SheetElement} node - node owns the property and need to edit
     * @param {String} propertyValue - name of the binding property
     * @param {Point} location - location to show the edit
     * @param {String} styleName - CSS name
     * @param {String} cssText - inline CSS string for the text editor
     */
    this.editProperty = function( node, propertyValue, location, styleName, cssText ) {
        if( node ) {
            var textEditCommand = diagramView.getManager().getCommandManager().getCommand(
                dfCommands.TEXT_EDIT_COMMAND );
            if( textEditCommand ) {
                var editor = textEditCommand.getInlineEditor();
                editor.className = styleName;
                textEditCommand.executeInlineEditor( location, node, propertyValue, false, null, cssText );
            }
        }
    };

    var finishEditNodeProperty = function() {
        var textEditCommand = diagramView.getManager().getCommandManager().getCommand(
            dfCommands.TEXT_EDIT_COMMAND );
        if( textEditCommand && textEditCommand.isEditing() ) {
            textEditCommand.finishInlineTextEditing();

            if( cachedDeferred ) {
                var editData = {
                    newValue: textEditCommand.getEditor().textContent
                };
                cachedDeferred.resolve( editData );
                cachedDeferred = null;
            }
        }
    };

    /**
     * Show edit box on a node and start to edit
     *
     * @param {SheetElement} editingNode - node is editing
     * @param {Element} clickedDomElement - dom element owned by the node
     * @param {String} editPropertyName - name of the editing property
     * @param {String} editValue - the original text of the editing property
     */
    this.editNodeProperty = function( editingNode, clickedDomElement, editPropertyName, editValue ) {
        var deferred = AwPromiseService.instance.defer();

        finishEditNodeProperty();

        originalValue = editValue;

        editingDomElement = clickedDomElement;
        self.editingPropertyName = editPropertyName;
        clickedDomElement.setAttribute( 'visibility', 'hidden' ); // $NON-NLS-1$ //$NON-NLS-2$
        var style = window.getComputedStyle( clickedDomElement, null );

        var fontSize = style.fontSize;
        var zoomFactor = diagramView.getCurrentZoomRatio();

        // The color of SVG text is determined by fill attribute, so get the fill attribute first.
        var fontColor = style.fill;
        if( !fontColor ) {
            fontColor = style.color;
        }

        var textPosition = {
            x: clickedDomElement.getBoundingClientRect().left,
            y: clickedDomElement.getBoundingClientRect().top
        };
        var textPositionOnView = diagramView.getViewToPageTransform().invert().transformPoint( textPosition );

        var cssStr = 'background-color:' + style.backgroundColor + ';font-size:' // $NON-NLS-1$//$NON-NLS-2$
            +
            fontSize + ';border:none;color:' + fontColor; // $NON-NLS-1$

        var textCSS = cssStr + ';width:' + ( editingNode.getWidth() - 80 ) * zoomFactor + 'px'; // $NON-NLS-1$ //$NON-NLS-2$

        textCSS += ';height:auto'; // $NON-NLS-1$

        self.editProperty( editingNode, editValue, textPositionOnView, 'aw-graph-textEditor', textCSS );

        cachedDeferred = deferred;
        return deferred.promise;
    };

    /**
     * Commit the edit result and fire a 'awGraph.nodeTextChanged' event
     *
     * @param {SheetElement} editingNode the edit on the diagram view.
     * @param {String} committedPropertyValue the new value
     * @param {SheetElement} overlayAssoicateNode the associate node of editing overlay node
     */
    this.commitNodeEdit = function( editingNode, committedPropertyValue, overlayAssoicateNode ) {
        var graph = graphModel.graphControl.graph;

        // To remove the visibility attribute set before showing the inline editor
        editingDomElement.removeAttribute( 'visibility' );
        if( committedPropertyValue !== undefined ) {
            var newBindData = {};

            if( _.trim( committedPropertyValue ) !== '' ) {
                newBindData[ self.editingPropertyName ] = committedPropertyValue;
                graph.updateNodeBinding( editingNode, newBindData );
            }

            var realEditingNode = overlayAssoicateNode ? overlayAssoicateNode : editingNode;

            var editData = {
                editNode: realEditingNode,
                propertyName: self.editingPropertyName,
                oldValue: originalValue,
                newValue: committedPropertyValue
            };
            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.nodeEditCommitted', editData );

            if( cachedDeferred ) {
                cachedDeferred.resolve( editData );
                cachedDeferred = null;
            }

            originalValue = null;
            editingDomElement = null;
            self.editingPropertyName = null;
        }
    };

    /**
     * Cancel the edit and hide the editor box
     * @param {SheetElement} editingNode the edit on the diagram view.
     * @param {SheetElement} overlayAssoicateNode the associate node of editing overlay node
     */
    this.cancelNodeEdit = function( editingNode, overlayAssoicateNode ) {
        editingDomElement.removeAttribute( 'visibility' ); // $NON-NLS-1$

        var realEditingNode = overlayAssoicateNode ? overlayAssoicateNode : editingNode;
        internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.nodeEditCancelled', {
            editNode: realEditingNode
        } );

        if( cachedDeferred ) {
            cachedDeferred.reject( 'cancel edit' );
            cachedDeferred = null;
        }
    };

    /**
     * return diagram view which the editing gesture on
     *
     * @returns {Object} The diagram view which owns the edit box
     */
    this.getDiagramView = function() {
        return diagramView;
    };

    return this;
};

/**
 * Create Graph Control instance
 *
 * @param graphModel the graph model object
 * @param diagramView the diagram object
 * @returns PropertyEditHandler
 */
export let createPropertyEditHandler = function( graphModel, diagramView ) {
    return new exports.PropertyEditHandler( graphModel, diagramView );
};

export default exports = {
    PropertyEditHandler,
    createPropertyEditHandler
};
/**
 * The factory to create node property edit handler.
 *
 * @member editPropertyService
 * @memberof NgServices
 */
app.factory( 'editPropertyService', () => exports );
