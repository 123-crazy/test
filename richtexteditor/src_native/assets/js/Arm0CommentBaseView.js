// Copyright (c) 2021 Siemens
/* global
   CKEDITOR5
*/

/**
 * This Plugin is for enhancing the OOTB comment view to AW Standard.
 *
 * @module js/Arm0CommentBaseView
 */
 import ckeditorOperations from 'js/ckeditorOperations';
 import ckEditor5Utils from 'js/ckEditor5Utils';
 import localeService from 'js/localeService';
 import appCtxSvc from 'js/appCtxService';

export default class NewCommentBaseView extends CKEDITOR5.CommentThreadView {
    constructor( ...args ) {
        super( ...args );
        this._getTemplate();
    }
    _getTemplate() {
        const templateDefinition = super._getTemplate();

        templateDefinition.children.unshift(
            {
                tag: 'div',
                attributes: {
                    class: 'ck-thread-top-bar'
                },

                children: [
                    this._createCommentStatusListView()
                ]
            }
        );

        return templateDefinition;
    }
    _createCommentStatusListView() {
        // Get locale specific file and properties
        var resource = 'RichTextEditorCommandPanelsMessages';
        var localTextBundle = localeService.getLoadedText( resource );
        var openStr = localTextBundle.open;
        var repliedStr = localTextBundle.replied;
        var resolvedStr = localTextBundle.resolved;
        var rejectedStr = localTextBundle.rejected;
        var reopenedStr = localTextBundle.reopened;

        const dropdownView = new CKEDITOR5.createDropdown( this.locale );
        const threadId = this.commentsListView._model.id;
        var parentComment = null;
        var status = null;
        // Bind Dropdown to comments list
        _bindDropdownWidget( dropdownView, this.commentsListView );
        var commentsMap = ckEditor5Utils.getCommentsMap();
        if ( commentsMap.has( threadId ) ) {
            parentComment = commentsMap.get( threadId )[0];
            status = ckeditorOperations.getStatusComments( parentComment );
            switch ( status ) {
                case 'open':
                    status = openStr;
                    break;
                case 'replied':
                    status = repliedStr;
                    break;
                case 'resolved':
                    status = resolvedStr;
                    break;
                case 'rejected':
                    status = rejectedStr;
                    break;
                case 'reopened':
                    status = reopenedStr;
                    break;
                default:
                // No action to perform
            }
            dropdownView.buttonView.set( {
                label: status,
                withText: true
            } );
        }else {
            dropdownView.buttonView.set( {
                label: openStr,
                withText: true
            } );
        }
        // Bind thread state to comments list
        _bindThreadState( dropdownView, this.commentsListView, openStr, repliedStr, threadId );

        const items = new CKEDITOR5.Collection();
        items.add( {
            type: 'button',
            model: new CKEDITOR5.Model( {
                id: 'replied',
                withText: true,
                label: repliedStr
            } )
        } );
        items.add( {
            type: 'button',
            model: new CKEDITOR5.Model( {
                id: 'resolved',
                withText: true,
                label: resolvedStr
            } )
        } );
        items.add( {
            type: 'button',
            model: new CKEDITOR5.Model( {
                id: 'rejected',
                withText: true,
                label: rejectedStr
            } )
        } );
        items.add( {
            type: 'button',
            model: new CKEDITOR5.Model( {
                id: 'reopened',
                withText: true,
                label: reopenedStr
            } )
        } );

        CKEDITOR5.addListToDropdown( dropdownView, items );

        dropdownView.on( 'execute', ( eventInfo ) => {
            const { id, label } = eventInfo.source;
            if( id && label ) {
                eventInfo.path[2].buttonView.set( 'id', id );
                eventInfo.path[2].buttonView.set( 'label', label );
                var clickedElement = eventInfo.source.element;
                var threadId = locateThreadId( clickedElement );

                //update the comments json in memory
                var commentsMap = ckEditor5Utils.getCommentsMap();
                _updateCommentStatusForThread( commentsMap, threadId, id );

                // Enable the Save Edits button if not already
                if( !appCtxSvc.ctx.requirementEditorContentChanged ) {
                    appCtxSvc.registerCtx( 'requirementEditorContentChanged', true );
                }
            }
        } );

        return dropdownView;
    }
}

/**
 * Gets the CKEDITOR.dom.element closest to the 'node'
 *
 * @param {CKEDITOR.dom.node}
 *            node Start the search from this node.
 * @returns {String} ThreadId or
 *          `null` if not found.
 */
 function locateThreadId( node ) {
    if( !node ) {
        return null;
    }
    if( node.classList && node.classList.contains( 'ck-thread' ) ) {
        return node.getAttribute( 'data-thread-id' );
    }

    return locateThreadId( node.parentNode );
}

/**
 * Bind the button enable state with the comment list view
 *
 * @param {CKEDITOR.dom.node} dropdownView - dropdownButton node
 * @param {CKEDITOR.dom.node} commentsListView - comment list view node
 */
 function _bindDropdownWidget( dropdownView, commentsListView ) {
    // Enable the dropdown's button when there is more than 1 comment in a comment thread
    dropdownView.bind( 'isEnabled' ).to( commentsListView, 'length', ( length ) => {
        if( length > 1 ) {
            return true;
        }
        return false;
    } );
}

/**
 * Changes thread state on the fly
 *
 * @param {CKEDITOR.dom.node} dropdownView - dropdownButton node
 * @param {CKEDITOR.dom.node} commentsListView - comment list view node
 * @param {String} openStr - open string
 * @param {String} repliedStr - reply string
 * @param {String} threadId - thread id
 */
 function _bindThreadState( dropdownView, commentsListView, openStr, repliedStr, threadId ) {
    const curThreadId = threadId;
    dropdownView.buttonView.bind( 'label' ).to( commentsListView, 'length', ( length ) => {
        var commentsMap = ckEditor5Utils.getCommentsMap();
        if( length > 1 ) {
            if( length === 2 && dropdownView.buttonView.label === openStr ) {
                _updateCommentStatusForThread( commentsMap, curThreadId, repliedStr.toLowerCase() );
                return repliedStr;
            }else if( length >= 2 ) {
                _updateCommentStatusForThread( commentsMap, curThreadId, dropdownView.buttonView.label.toLowerCase() );
                return dropdownView.buttonView.label;
            }
        }else if( length === 1 && dropdownView.buttonView.label !== openStr ) {
            _updateCommentStatusForThread( commentsMap, curThreadId, openStr.toLowerCase() );
            return openStr;
        }
        return openStr;
    } );
}

/**
 * Update the comments json in commentsMap
 *
 * @param {CKEDITOR.dom.node} commentsMap - dropdownButton node
 * @param {CKEDITOR.dom.node} threadId - comment list view node
 * @param {CKEDITOR.dom.node} id - comment list view node
 */
 function _updateCommentStatusForThread( commentsMap, threadId, id ) {
    if ( threadId && commentsMap.has( threadId ) ) {
        var allComments = commentsMap.get( threadId );
        allComments.forEach( element => {
            element.status = id;
        } );
    }
}


