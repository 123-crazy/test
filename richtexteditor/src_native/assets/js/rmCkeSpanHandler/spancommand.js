/* global
   CKEDITOR5
*/

// SpanCommand is to check whether the given block can be converted in span tag extending the command plugin
export default class SpanCommand extends CKEDITOR5.Command {
    refresh() {
        const model = this.editor.model;
        const document = model.document;
        const block = CKEDITOR5.first( document.selection.getSelectedBlocks() );
        this.value = Boolean( block ) && block.is( 'span' );
        this.isEnabled = Boolean( block ) && ifSpan( block, model.schema );
    }
    execute( options = {} ) {
        const model = this.editor.model;
        const document = model.document;

        model.change( writer => {
            const blocks = ( options.selection || document.selection ).getSelectedBlocks();

            for ( const block of blocks ) {
                if ( !block.is( 'span' ) && ifSpan( block, model.schema ) ) {
                    writer.rename( block, 'span' );
                }
            }
        } );
    }
}
    function ifSpan( block, schema ) {
        return schema.checkChild( block.parent, 'span' ) && !schema.isObject( block );
    }
