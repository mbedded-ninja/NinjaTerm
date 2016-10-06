package ninja.mbedded.ninjaterm.model.terminal.txRx;

import javafx.beans.property.SimpleStringProperty;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.Node;
import ninja.mbedded.ninjaterm.interfaces.RawDataReceivedListener;
import ninja.mbedded.ninjaterm.interfaces.NewStreamedTextListener;
import ninja.mbedded.ninjaterm.model.Model;
import ninja.mbedded.ninjaterm.model.terminal.Terminal;
import ninja.mbedded.ninjaterm.model.terminal.txRx.colouriser.Colouriser;
import ninja.mbedded.ninjaterm.model.terminal.txRx.display.Display;
import ninja.mbedded.ninjaterm.model.terminal.txRx.filters.Filters;
import ninja.mbedded.ninjaterm.model.terminal.txRx.formatting.Formatting;
import ninja.mbedded.ninjaterm.util.ansiECParser.AnsiECParser;
import ninja.mbedded.ninjaterm.util.debugging.Debugging;
import ninja.mbedded.ninjaterm.util.streamingFilter.StreamingFilter;
import ninja.mbedded.ninjaterm.util.streamedText.StreamedText;

import java.util.ArrayList;
import java.util.List;

/**
 * Model handling the TX/RX data of a terminal. This is displayed as a sub-tab of a terminal
 * tab in the GUI.
 *
 * @author          Geoffrey Hunter <gbmhunter@gmail.com> (www.mbedded.ninja)
 * @since           2016-09-16
 * @last-modified   2016-09-30
 */
public class TxRx {

    //================================================================================================//
    //=========================================== CLASS FIELDS =======================================//
    //================================================================================================//

    private Model model;
    private Terminal terminal;

    public Display display = new Display();
    public Formatting formatting = new Formatting();
    public Colouriser colouriser = new Colouriser();
    public Filters filters = new Filters();

    public ObservableList<Byte> toSendTxData = FXCollections.observableArrayList();
    public SimpleStringProperty txData = new SimpleStringProperty("");

    /**
     * Initialise with "" so that it does not display "null".
     */
    public SimpleStringProperty rawRxData = new SimpleStringProperty("");

    /**
     * Because we need to support rich text, we need to use a list of "Nodes" to
     * store the RX data. This list of nodes is directly supported by a TextFlow
     * object on the UI.
     */
    public ObservableList<Node> rxDataAsList = FXCollections.observableArrayList();

    int numOfRxCharsInAnsiOutput = 0;

    private AnsiECParser ansiECParser = new AnsiECParser();

    private StreamedText ansiParserOutput = new StreamedText();

    /**
     * This is a buffer for the output of the ANSI parser. This is for when the filter text
     * is changed, and the user wishes to re-run the filter over data stored in the buffer.
     */
    private StreamedText totalAnsiParserOutput = new StreamedText();

    /**
     * Used to provide filtering functionality to the RX data.
     */
    private StreamingFilter streamingFilter = new StreamingFilter();

    private StreamedText filterOutput = new StreamedText();

    public List<RawDataReceivedListener> rawDataReceivedListeners = new ArrayList<>();
    public List<NewStreamedTextListener> newStreamedTextListeners = new ArrayList<>();
    public List<RxDataClearedListener> rxDataClearedListeners = new ArrayList<>();

    //================================================================================================//
    //========================================== CLASS METHODS =======================================//
    //================================================================================================//

    public TxRx(Model model, Terminal terminal) {

        this.model = model;
        this.terminal = terminal;

        display.bufferSizeChars.addListener((observable, oldValue, newValue) -> {
            removeOldCharsFromBuffers();
        });

        filters.filterApplyType.addListener((observable, oldValue, newValue) -> {
            if(newValue == Filters.FilterApplyTypes.APPLY_TO_BUFFERED_AND_NEW_RX_DATA) {
                updateBufferedRxDataWithNewFilterPattern();
            }
        });

        filters.filterText.addListener((observable, oldValue, newValue) -> {
            filterTextChanged(newValue);
        });
    }

    public void handleKeyPressed(byte asciiCodeForKey) {
        if(terminal.comPort.isPortOpen() == false) {
            model.status.addErr("Cannot send data to COM port, port is not open.");
            return;
        }

        // If to see if we are sending data on "enter", and the "backspace
        // deletes last typed char" checkbox is ticked, if so, remove last char rather than
        // treating this character as something to send.
        if((display.selTxCharSendingOption.get() == Display.TxCharSendingOptions.SEND_TX_CHARS_ON_ENTER) &&
                display.backspaceRemovesLastTypedChar.get()) {

            if((char)asciiCodeForKey == '\b') {
                // We need to remove the last typed char from the "to send" TX buffer
                removeLastCharInTxBuffer();
                return;
            }
        }

        // Look for enter. If enter was pressed, we need to insert the right chars as
        // set by the user in the ("enter key behaviour" radio buttons).
        if((char)asciiCodeForKey == '\r') {
            System.out.println("Enter key was pressed.");

            switch(formatting.selEnterKeyBehaviour.get()) {
                case CARRIAGE_RETURN:
                    addTxCharToSend((byte)'\r');
                    break;
                case NEW_LINE:
                    addTxCharToSend((byte)'\n');
                    break;
                case CARRIAGE_RETURN_AND_NEW_LINE:
                    addTxCharToSend((byte)'\r');
                    addTxCharToSend((byte)'\n');
                    break;
                default:
                    throw new RuntimeException("selEnterKeyBehaviour was not recognised.");
            }
        } else {
            // Key pressed was NOT enter,
            // so append the character to the end of the "to send" TX buffer
            addTxCharToSend(asciiCodeForKey);
        }

        // Check so see what TX mode we are in
        switch(display.selTxCharSendingOption.get()) {
            case SEND_TX_CHARS_IMMEDIATELY:
                break;
            case SEND_TX_CHARS_ON_ENTER:
                // Check for enter key before sending data
                if(!((char)asciiCodeForKey == '\r'))
                    return;
                break;
            default:
                throw new RuntimeException("selTxCharSendingOption not recognised!");
        }

        // Send data to COM port, and update stats (both local and global)
        byte[] dataAsByteArray = fromObservableListToByteArray(toSendTxData);
        terminal.comPort.sendData(dataAsByteArray);

        terminal.stats.numCharactersTx.setValue(terminal.stats.numCharactersTx.getValue() + dataAsByteArray.length);
        model.globalStats.numCharactersTx.setValue(model.globalStats.numCharactersTx.getValue() + dataAsByteArray.length);

        txDataSent();
    }

    private byte[] fromObservableListToByteArray(ObservableList<Byte> observableList) {

        byte[] data = new byte[observableList.size()];
        int i = 0;
        for(Byte singleByte : observableList) {
            data[i++] = singleByte;
        }

        return data;
    }

    /**
     * Add a TX char to send to COM port. This DOES NOT send the data but rather only adds it to a buffer.
     * @param data
     */
    public void addTxCharToSend(byte data) {

        //String dataAsString = new String(new byte[]{ data }, StandardCharsets.US_ASCII);
        System.out.printf(getClass().getName() + ".addTxCharToSend() called with data = 0x%02X\r\n", data);
        //System.out.println(getClass().getName() + ".addTxCharToSend() called with data = " + dataAsString);

        // Create string from data
        /*String dataAsString = "";
        for(int i = 0; i < data.length; i++) {
            dataAsString = dataAsString + (char)data[i];
        }*/

        txData.set(txData.get() + (char)data);
        toSendTxData.add(data);

        if(txData.get().length() > display.bufferSizeChars.get()) {
            // Truncate TX data, removing old characters
            txData.set(removeOldChars(txData.get(), display.bufferSizeChars.get()));
        }

    }

    public void removeLastCharInTxBuffer() {

        if(toSendTxData.size() > 0) {
            // Remove the last char from both the "to send" TX buffer,
            // and the TX display string
            toSendTxData.remove(toSendTxData.size() - 1);
            txData.set(txData.get().substring(0, txData.get().length() - 1));
        }
    }

    public void txDataSent() {

        // Create string from data
        String dataAsString = "";
        for(int i = 0; i < toSendTxData.size(); i++) {
            dataAsString = dataAsString + (char)toSendTxData.get(i).byteValue();
        }

        // Clean "to send" TX data
        toSendTxData.clear();

        // Echo TX data into TX/RX pane
        if(display.localTxEcho.get()) {
            rawRxData.set(rawRxData.get() + dataAsString);

            if(rawRxData.get().length() > display.bufferSizeChars.get()) {
                // Remove old characters from buffer
                rawRxData.set(removeOldChars(rawRxData.get(), display.bufferSizeChars.get()));
            }
        }
    }


    /**
     * Adds RX data to the RX pane (both the raw RX data and the filtered RX data, which is the
     * data which gets displayed to the user in the RX pane).
     * @param data
     */
    public void addRxData(String data) {
//        System.out.println(getClass().getSimpleName() + ".addRxData() called with data = \"" + Debugging.convertNonPrintable(data) + "\".");

        rawRxData.set(rawRxData.get() + data);

        // Truncate if necessary
        if(rawRxData.get().length() > display.bufferSizeChars.get()) {
            // Remove old characters from buffer
            rawRxData.set(removeOldChars(rawRxData.get(), display.bufferSizeChars.get()));
        }

        //==============================================//
        //============== ANSI ESCAPE CODES =============//
        //==============================================//

        // This temp variable is used to store just the new ANSI parser output data, which
        // is then stored in totalAnsiParserOutput before being shifted into just ansiParserOutput
        StreamedText tempAnsiParserOutput = new StreamedText();
        ansiECParser.parse(data, tempAnsiParserOutput);

//        System.out.println("tempAnsiParserOutput = " + tempAnsiParserOutput);

        // Append the output of the ANSI parser to the "total" ANSI parser output buffer
        // This will be used if the user changes the filter pattern and wishes to re-run
        // it on buffered data.
        // NOTE: We only want to append NEW data added to the ANSI parser output, since
        // there may still be characters in there from last time this method was called, and
        // we don't want to add them twice
        totalAnsiParserOutput.copyCharsFrom(tempAnsiParserOutput, tempAnsiParserOutput.getText().length());

//        System.out.println("totalAnsiParserOutput = " + totalAnsiParserOutput);
//
//        if(!totalAnsiParserOutput.checkAllNewLinesHaveColors()) {
//            int bogus = 0;
//        }

        // Now add all the new ANSI parser output to any that was not used up by the
        // streaming filter from last time
        ansiParserOutput.shiftCharsIn(tempAnsiParserOutput, tempAnsiParserOutput.getText().length());

        //==============================================//
        //================== FILTERING =================//
        //==============================================//

        // NOTE: filteredRxData is the actual text which gets displayed in the RX pane
        streamingFilter.parse(ansiParserOutput, filterOutput);

        //==============================================//
        //=================== TRIMMING =================//
        //==============================================//

        // Trim total ANSI parser output
        if(totalAnsiParserOutput.getText().length() > display.bufferSizeChars.get()) {
//            System.out.println("Trimming totalAnsiParserOutput...");
            int numOfCharsToRemove = totalAnsiParserOutput.getText().length() - display.bufferSizeChars.get();
            totalAnsiParserOutput.removeChars(numOfCharsToRemove);
        }

        // NOTE: UI buffer is trimmed in view controller

        //==============================================//
        //============== LISTENER NOTIFICATION =========//
        //==============================================//

        // Call any listeners that want the raw data (the logging class of the model might be listening)
        for(RawDataReceivedListener rawDataReceivedListener : rawDataReceivedListeners) {
            rawDataReceivedListener.update(data);
        }

        // Notify that there is new UI data to display (this is NOT the same
        // as the raw data)
        for(NewStreamedTextListener newStreamedTextListener : newStreamedTextListeners) {
            newStreamedTextListener.run(filterOutput);
        }

        System.out.println(getClass().getSimpleName() + ".addRxData() finished.");
    }

    /**
     * Trims a string to the provided number of characters. Removes characters from the start of the string
     * (the "old" chars).
     * @param data
     * @param desiredLength
     * @return  The trimmed string.
     */
    public String removeOldChars(String data, int desiredLength) {
        return data.substring(data.length() - desiredLength, data.length());
    }

    public void removeOldCharsFromBuffers() {

        if(txData.get().length() > display.bufferSizeChars.get()) {
            // Truncate TX data, removing old characters
            txData.set(removeOldChars(txData.get(), display.bufferSizeChars.get()));
        }

        if(rawRxData.get().length() > display.bufferSizeChars.get()) {
            // Remove old characters from buffer
            rawRxData.set(removeOldChars(rawRxData.get(), display.bufferSizeChars.get()));
        }


    }

    public void clearTxAndRxData() {
        //rxDataAsList.clear();
        // Emit RX data cleared event
        for(RxDataClearedListener rxDataClearedListener : rxDataClearedListeners) {
            rxDataClearedListener.go();
        }
    }

    /**
     * Call this method to update the buffered RX data based on a new filter pattern.
     */
    private void updateBufferedRxDataWithNewFilterPattern() {
        // Emit RX data cleared event
        for(RxDataClearedListener rxDataClearedListener : rxDataClearedListeners) {
            rxDataClearedListener.go();
        }
    }

    /**
     * This needs to be called when the filter text is changed so that everything is updated
     * accordingly.
     * @param filterText
     */
    private void filterTextChanged(String filterText) {

        streamingFilter.setFilterPatten(filterText);

        if(filters.filterApplyType.get() == Filters.FilterApplyTypes.APPLY_TO_BUFFERED_AND_NEW_RX_DATA) {

            // Firstly, clear RX data on UI
            clearTxAndRxData();

            // Clear all filter output
            filterOutput.clear();

            // We need to run the entire ANSI parser output back through the filter
            // Make a temp. StreamedText object that can be consumed (we want to preserve
            // totalAnsiParserOutput).
            StreamedText toBeConsumed = new StreamedText(totalAnsiParserOutput);

            // The normal ansiParserOutput should now be changed to point
            // to this toBeConsumed object
            ansiParserOutput = toBeConsumed;

            streamingFilter.parse(toBeConsumed, filterOutput);

            // Notify that there is new UI data to display
            for(NewStreamedTextListener newStreamedTextListener : newStreamedTextListeners) {
                newStreamedTextListener.run(filterOutput);
            }

        }
    }

}
