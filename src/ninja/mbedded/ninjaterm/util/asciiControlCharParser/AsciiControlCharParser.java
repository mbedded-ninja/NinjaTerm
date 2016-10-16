package ninja.mbedded.ninjaterm.util.asciiControlCharParser;

import javafx.beans.property.SimpleBooleanProperty;
import ninja.mbedded.ninjaterm.util.loggerUtils.LoggerUtils;
import ninja.mbedded.ninjaterm.util.streamedText.StreamedText;
import org.slf4j.Logger;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Detects ASCII control characters and inserts the appropriate visible unicode character equivalent.
 *
 * Used for visualising control characters.
 *
 * @author Geoffrey Hunter <gbmhunter@gmail.com> (www.mbedded.ninja)
 * @last-modified 2016-10-13
 * @since 2016-10-13
 */
public class AsciiControlCharParser {

    //================================================================================================//
    //=========================================== CLASS FIELDS =======================================//
    //================================================================================================//

    public SimpleBooleanProperty replaceWithVisibleSymbols = new SimpleBooleanProperty(false);

    private Map<String, String> controlCharToVisibleChar = new HashMap<>();

    private Logger logger = LoggerUtils.createLoggerFor(getClass().getName());

    private String[][] controlCharToVisibleCharA = {
            { "\r", "↵"},
            { "\n", "␤"},
            { "\u001B", "␛" }
    };

    //================================================================================================//
    //========================================== CLASS METHODS =======================================//
    //================================================================================================//

    public AsciiControlCharParser() {

        // Build the hashmap from the simple two-dimensional array
        for(String[] controlCharToVisibleCharMapping : controlCharToVisibleCharA) {
            controlCharToVisibleChar.put(controlCharToVisibleCharMapping[0], controlCharToVisibleCharMapping[1]);
        }

    }

    public void parse(StreamedText input, StreamedText releasedText) {

        Pattern pattern = Pattern.compile("\\p{Cntrl}");

        // Now create matcher object.
        Matcher matcher = pattern.matcher(input.getText());

        //String output = "";
        int currIndex = 0;

        while(matcher.find()) {
            logger.debug("Found regex match = \"" + matcher.group(0) + "\".");
            logger.debug("match start = " + matcher.start());
            logger.debug("match end = " + matcher.end());

            // Look for character in map
            String replacementChar = "";

            if(replaceWithVisibleSymbols.get()) {
                replacementChar = controlCharToVisibleChar.get(matcher.group(0));

                // If no replacement character was found for this control code, ignore it and continue onto next iteration of
                // loop
                if(replacementChar == "") {
                    logger.debug("No replacement char found for this control code.");
                } else {
                    logger.debug("Replacement char = " + replacementChar);
                }
            }

            // Shift all characters before this match
            releasedText.shiftCharsIn(input, matcher.start() - currIndex);

            // Safely delete this char from the input
            // (it should now be the first character)
            input.removeChar(0);

            currIndex = matcher.end();

            if(replacementChar != null) {
                releasedText.append(replacementChar);
            }

            //output = output + beforeChars + replacementChar;

            //input = matcher.replaceFirst(replacementChar);

            //logger.debug("output = " + output);

        }

        // No more matches have been found, but we still need to copy the last piece of
        // text across (if any)
        //output = output + input.substring(currIndex, input.length());
        releasedText.shiftCharsIn(input, input.getText().length());

        //return output;
    }
}
