/*global
CKEDITOR5
 */


import { getSelectedMathModelWidget } from 'js/rmCkeInsertEquation/utils';
const inlineMathTexString = 'mathtex-inline';
const displayMathTexString = 'mathtex-display';

export default class MathCommand extends CKEDITOR5.Command {
    execute( equation, display, outputType, forceOutputType ) {
        const model = this.editor.model;
        const selection = model.document.selection;
        const selectedElement = selection.getSelectedElement();

        model.change( writer => {
            let mathtex;
            if ( selectedElement && ( selectedElement.is( 'element', inlineMathTexString ) ||
                selectedElement.is( 'element', displayMathTexString ) ) ) {
                // Update selected element
                const typeAttr = selectedElement.getAttribute( 'type' );

                // Use already set type if found and is not forced
                const type = forceOutputType ? outputType : typeAttr || outputType;

                mathtex = writer.createElement( display ? displayMathTexString : inlineMathTexString, { equation, type, display } );
            } else {
                // Create new model element
                mathtex = writer.createElement( display ? displayMathTexString : inlineMathTexString, { equation, type: outputType, display } );
            }
            model.insertContent( mathtex );
            writer.setSelection( mathtex, 'on' );
        } );
    }

    refresh() {
        const model = this.editor.model;
        const selection = model.document.selection;
        const selectedElement = selection.getSelectedElement();
        //added to disable command in case of header content selection
        const allowedIn = model.schema.findAllowedParent( selection.getFirstPosition(), displayMathTexString );

        this.isEnabled = ( selectedElement === null || ( selectedElement.is( 'element', inlineMathTexString ) ||
            selectedElement.is( 'element', displayMathTexString ) ) ) && allowedIn !== null;

        const selectedEquation = getSelectedMathModelWidget( selection );
        this.value = selectedEquation ? selectedEquation.getAttribute( 'equation' ) : null;
        this.display = selectedEquation ? selectedEquation.getAttribute( 'display' ) : null;
    }
}
