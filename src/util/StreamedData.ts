import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants'
import Marker, { Association } from './Marker'

declare global {
  interface RegExp {
    toPartialMatchRegex(): RegExp;
  }
}

RegExp.prototype.toPartialMatchRegex = function() {
  "use strict";

  var re = this,
      source = this.source,
      i = 0;

  function process () {
      var result = "",
          tmp;

      function appendRaw(nbChars) {
          result += source.substr(i, nbChars);
          i += nbChars;
      };

      function appendOptional(nbChars) {
          result += "(?:" + source.substr(i, nbChars) + "|$)";
          i += nbChars;
      };

      while (i < source.length) {
          switch (source[i])
          {
              case "\\":
                  switch (source[i + 1])
                  {
                      case "c":
                          appendOptional(3);
                          break;

                      case "x":
                          appendOptional(4);
                          break;

                      case "u":
                          if (re.unicode) {
                              if (source[i + 2] === "{") {
                                  appendOptional(source.indexOf("}", i) - i + 1);
                              } else {
                                  appendOptional(6);
                              }
                          } else {
                              appendOptional(2);
                          }
                          break;

                      case "p":
                      case "P":
                          if (re.unicode) {
                              appendOptional(source.indexOf("}", i) - i + 1);
                          } else {
                              appendOptional(2);
                          }
                          break;

                      case "k":
                          appendOptional(source.indexOf(">", i) - i + 1);
                          break;

                      default:
                          appendOptional(2);
                          break;
                  }
                  break;

              case "[":
                  tmp = /\[(?:\\.|.)*?\]/g;
                  tmp.lastIndex = i;
                  tmp = tmp.exec(source);
                  appendOptional(tmp[0].length);
                  break;

              case "|":
              case "^":
              case "$":
              case "*":
              case "+":
              case "?":
                  appendRaw(1);
                  break;

              case "{":
                  tmp = /\{\d+,?\d*\}/g;
                  tmp.lastIndex = i;
                  tmp = tmp.exec(source);
                  if (tmp) {
                      appendRaw(tmp[0].length);
                  } else {
                      appendOptional(1);
                  }
                  break;

              case "(":
                  if (source[i + 1] == "?") {
                      switch (source[i + 2])
                      {
                          case ":":
                              result += "(?:";
                              i += 3;
                              result += process() + "|$)";
                              break;

                          case "=":
                              result += "(?=";
                              i += 3;
                              result += process() + ")";
                              break;

                          case "!":
                              tmp = i;
                              i += 3;
                              process();
                              result += source.substr(tmp, i - tmp);
                              break;

                          case "<":
                              switch (source[i + 3])
                              {
                                  case "=":
                                  case "!":
                                      tmp = i;
                                      i += 4;
                                      process();
                                      result += source.substr(tmp, i - tmp);
                                      break;

                                  default:
                                      appendRaw(source.indexOf(">", i) - i + 1);
                                      result += process() + "|$)";
                                      break;
                              }
                              break;
                      }
                  } else {
                      appendRaw(1);
                      result += process() + "|$)";
                  }
                  break;

              case ")":
                  ++i;
                  return result;

              default:
                  appendOptional(1);
                  break;
          }
      }

      return result;
  }

  return new RegExp(process(), this.flags);
};



public enum CopyOrShift {

  /**
   * Copies data and does not alter the "copied from" object.
   */
  COPY,

  /**
   * Shifts data and deletes the shifted data from the "shifted from" object.
   */
  SHIFT,
}

export enum MarkerBehaviour {
  FILTERING,
  NOT_FILTERING
}

/**
 * Class which is designed to encapsulate a "unit" of streamed text, which is generated by the ANSI escape
 * code parser. This <code>{@link StreamedData}</code> object is then fed into the filter engine,
 * whose output is another <code>{@link StreamedData}</code> object.
 *
 * @author Geoffrey Hunter <gbmhunter@gmail.com> (www.mbedded.ninja)
 * @last-modified 2016-10-27
 * @since 2016-09-28
 */
export default class StreamedData {

    //================================================================================================//
    //======================================== CLASS CONSTANTS =======================================//
    //================================================================================================//

    /**
     * The character sequence which causes a new line to be inserted into a TextFlow
     * UI object in JavaFX. This is needed for the <code>shiftToTextNodes()</code> method.
     */
    const NEW_LINE_CHAR_SEQUENCE_FOR_TEXT_FLOW = '\n'

    //================================================================================================//
    //=========================================== ENUMS ==============================================//
    //================================================================================================//





    //================================================================================================//
    //=========================================== CLASS FIELDS =======================================//
    //================================================================================================//

    text = ""
//    private List<ColourMarker> colourMarkers = new ArrayList<>();
//    private Color colorToBeInsertedOnNextChar = null;

    /**
     * Holds the locations in <code>text</code> at which new lines are detected. This is populated by
     * a <code>NewLineParser</code> object. New lines are to be inserted AFTER the character pointed
     * to by each newLineMarker.
     * <p>
     * <code>shiftDataIn()</code> and <code>copyCharsIn()</code> modifies the markers as appropriate.
     */
//    private List<Integer> newLineMarkers = new ArrayList<>();

//    private List<TimeStampMarker> timeStampMarkers = new ArrayList<>();

    markers: Marker[] = []

    /**
     * The maximum number of chars this StreamedData object will contain, before it starts trimming the
     * oldest data.
     * <p>
     * If <code>maxNumChars</code> = -1, then the StreamedData object does not have a limit and
     * will never delete old data.
     */
    _maxNumChars = -1

    set maxNumChars(value: number) {
      this._maxNumChars = value
      // Add a listener so that if the maxNumChars property is changed, we trim as
      // required
      this.trimDataIfRequired()
    }

    get maxNumChars() {
      return this._maxNumChars
    }

    //================================================================================================//
    //========================================== CLASS METHODS =======================================//
    //================================================================================================//

    /**
     * Default constructor.
     */
    constructor () {
    }

    /**
     * Copy constructor. Uses the <code>copyCharsFrom()</code> to do the actual copying.
     * <p>
     * This also copies colour and new line markers correctly.
     *
     * @param streamedData
     */
    public StreamedData(streamedData: StreamedData) {

        // Call default constructor
        this.copyCharsFrom(streamedData, streamedData.getText().length(), MarkerBehaviour.NOT_FILTERING);
    }


    getText() {
      return this.text
    }

//    public List<ColourMarker> getColourMarkers() {
//        return colourMarkers;
//    }

//    public Color getColorToBeInsertedOnNextChar() {
//        return colorToBeInsertedOnNextChar;
//    }

//    public void setColorToBeInsertedOnNextChar(Color color) {
//        logger.debug("setColorToBeInsertedOnNextChar() called with color = " + color);
//        this.colorToBeInsertedOnNextChar = color;
//    }

    public getMarkers() {
        return this.markers
    }

    public addMarker(marker: Marker) {
        this.markers.push(marker)
    }

    /**
     * The method extracts the specified number of chars from the input and places them in the output.
     * It extract chars from the "to append" String first, and then starts removing chars from the first of the
     * Text nodes contained within the list.
     * <p>
     * It also shifts any chars from still existing input nodes into the "to append" String
     * as appropriate.
     *
     * @param numChars
     * @return
     */
    public shiftDataIn(inputStreamedData: StreamedData, numChars: number, markerBehaviour: MarkerBehaviour) {
        this.copyOrShiftCharsFrom(inputStreamedData, numChars, CopyOrShift.SHIFT, markerBehaviour);
    }

    /**
     * Clears all text, colour markers and new line markers from this object.
     * <p>
     * This leaves the object in the same state as a new StreamedData object.
     */
    public clear() {
        // "Reset" this object
        this.text = ""
//        getColourMarkers().clear();
//        colorToBeInsertedOnNextChar = null;

        //getNewLineMarkers().clear();
        this.markers = []
    }

    /**
     * Removes the specified number of characters from the start of this <code>{@link StreamedData}</code> object.
     *
     * @param numChars The number of characters to remove.
     */
    public removeCharsFromStart(numChars: number, deleteNewLines: boolean) {
        //StreamedData dummyStreamedData = new StreamedData();
        //dummyStreamedData.shiftDataIn(this, numChars);
        //checkAllColoursAreInOrder();

        for (let i = 0; i < numChars; i++) {
            this.removeChar(0, deleteNewLines);
        }
    }

    /**
     * The method copies/shifts the specified number of chars from the input into the output.
     * <p>
     * It also copies/shift any chars from still existing input nodes into the "to append" String
     * as appropriate.
     * <p>
     * Designed to be exposed publically via copy() or shift() methods.
     * </p>
     *
     * @param numChars The number of characters to copy or shift (starting from the start of the text).
     */
    private copyOrShiftCharsFrom(
            inputStreamedData: StreamedData,
            numChars: number,
            copyOrShift: CopyOrShift,
            markerBehaviour: MarkerBehaviour) {

        if (numChars > inputStreamedData.getText().length())
            throw Error("numChars is greater than the number of characters in inputStreamedData.")

        // Copy/shift the markers first
        this.copyOrShiftMarkers(inputStreamedData, numChars, copyOrShift, markerBehaviour);

//        // Apply the colour to be inserted on next char, if at least one char is
//        // going to be placed into this StreamedData object
//        if ((numChars > 0) && (this.colorToBeInsertedOnNextChar != null)) {
//
//            this.colourMarkers.add(new ColourMarker(this.text.length(), this.colorToBeInsertedOnNextChar));
//
//            // We have applied the color to a character, remove the placeholder
//            this.colorToBeInsertedOnNextChar = null;
//        }
//
//        for (ListIterator<ColourMarker> iter = inputStreamedData.colourMarkers.listIterator(); iter.hasNext(); ) {
//            ColourMarker oldColourMarker = iter.next();
//            ColourMarker newTextColor;
//
//            if (copyOrShift == CopyOrShift.COPY) {
//                // Copy text color object
//                newTextColor = new ColourMarker(oldColourMarker);
//            } else if (copyOrShift == CopyOrShift.SHIFT) {
//                // We can just modify the existing object, since we are shifting
//                newTextColor = oldColourMarker;
//            } else {
//                throw new RuntimeException("copyOrShift not recognised.");
//            }
//
//            // Check if we have reached ColourMarker objects which index characters beyond the range
//            // we are shifting, and if so, break out of this loop
//            if (oldColourMarker.position < numChars) {
//
//                // We need to offset set the position by the length of the existing text
//                newTextColor.position = oldColourMarker.position + text.length();
//                // Now add this ColourMarker object to this objects list, and remove from the input
//                colourMarkers.add(newTextColor);
//
//                if (copyOrShift == CopyOrShift.SHIFT) {
//                    iter.remove();
//                }
//
//            } else {
//                // We are beyond the range that is being shifted, so adjust the position, but
//                // don't shift the object to this list (keep in input)
//                if (copyOrShift == CopyOrShift.SHIFT) {
//                    newTextColor.position -= numChars;
//                }
//            }
//        }

        this.text = this.text + inputStreamedData.text.substring(0, numChars);

        if (copyOrShift == CopyOrShift.SHIFT) {
            inputStreamedData.text = inputStreamedData.text.substring(numChars, inputStreamedData.text.length)
        }


        // Transfer the "color to be inserted on next char", if one exists in input
        // This could overwrite an existing "color to be inserted on next char" in the output, if
        // no chars were shifted
//        if (inputStreamedData.getColorToBeInsertedOnNextChar() != null) {
//            this.setColorToBeInsertedOnNextChar(inputStreamedData.getColorToBeInsertedOnNextChar());
//
//            if (copyOrShift == CopyOrShift.SHIFT) {
//                inputStreamedData.setColorToBeInsertedOnNextChar(null);
//            }
//        }

        this.checkAllColoursAreInOrder();

        // The last thing we do before returning is trim the data
        // if now there is too much in this object
        this.trimDataIfRequired();
    }


    /**
     * This method expects the chars to be copied/shifted after this
     * method is finished (otherwise the input and output StreamedData
     * objects will be left in an invalid state).
     *
     * @param input
     * @param numChars
     * @param copyOrShift
     */
    private copyOrShiftMarkers(
            input: StreamedData,
            numChars: number,
            copyOrShift: CopyOrShift,
            markerBehaviour: MarkerBehaviour) {

        // Copy/shift markers within range
        //for (ListIterator<Marker> iter = input.getMarkers().listIterator(); iter.hasNext(); ) {
        length = input.getMarkers().length
        for (let i = SSL_OP_SSLEAY_080_CLIENT_DH_BUG; i < length; i++) {
            let element = input.getMarkers()[i]

            if (
                    (element.charPos < numChars)
                            ||
                            (element.charPos == numChars && markerBehaviour == MarkerBehaviour.NOT_FILTERING)
                            ||
                            (element.charPos == numChars && element instanceof NewLineMarker)
                    ) {


                // Make a copy of this marker in the output
//                addNewLineMarkerAt(getText().length() + element);
                let newMarker: Marker = element.deepCopy()
                newMarker.setCharPos(this.getText().length + element.getCharPos())
                this.markers.push(newMarker)

                switch (copyOrShift) {
                    case CopyOrShift.COPY:
                        // Do nothing
                        break;
                    case CopyOrShift.SHIFT:
                        // Remove the marker from the input
                        input.getMarkers().splice(i, 1)
                        i--;
                        break;
                    default:
                        throw Error("CopyOrShift enum unrecognised.");
                }

            } else {
                // We have copied/shifted all markers within range,
                // we just need to adjust the marker values for the remaining
                // markers in the input
                if (copyOrShift == CopyOrShift.SHIFT) {
//                    iter.set(element - numChars);
                    element.setCharPos(element.getCharPos() - numChars);
                }
            }
        }
    }


    public copyCharsFrom(inputStreamedData: StreamedData, numChars: number, markerBehaviour: MarkerBehaviour) {
        this.copyOrShiftCharsFrom(inputStreamedData, numChars, CopyOrShift.COPY, markerBehaviour);
    }

    /**
     * Adds the provided text to the stream, using the given <code>addMethod</code>.
     *
     * @param textToAppend
     */
    public append(textToAppend: string) {
//        logger.debug("append() called with text = \"" + Debugging.convertNonPrintable(textToAppend) + "\".");

        // Passing in an empty string is not invalid, but we don't have to do anything,
        // so just return.
        if (textToAppend === "")
            return

        this.text = this.text + textToAppend;

        // Apply the "color to be inserted on next char" if there is one to apply.
        // This will never be applied if no chars are inserted because of the return above
//        if (colorToBeInsertedOnNextChar != null) {
//            addColour(text.length() - textToAppend.length(), colorToBeInsertedOnNextChar);
//            colorToBeInsertedOnNextChar = null;
//        }

        this.checkAllColoursAreInOrder()

        // The last thing we do before returning is trim the data
        // if now there is too much in this object
        this.trimDataIfRequired()
    }

    public toString() {
        let output = " { ";

        output += "text: \"" + this.text + "\", "

        //==============================================//
        //==================== MARKERS =================//
        //==============================================//
        output += ", markers = {";
        for (const marker of this.markers) {
            output += " " + marker + ","
        }
        output += " }"

        // Terminating bracket
        output += " }"
        return output
    }

    private checkAllColoursAreInOrder() {

        let charIndex = -1
        for (let colourMarker of this.getColourMarkers()) {
            if (colourMarker.charPos <= charIndex)
                throw Error("Colours were not in order!")

            charIndex = colourMarker.charPos
        }
    }

    /**
     * Checks if there is a colour change at the specified character index.
     *
     * @param charIndex
     * @return
     */
    public isColorAt(charIndex: number) {
        for (let colourMarker of this.getColourMarkers()) {
            if (colourMarker.charPos === charIndex)
                return true
        }

        // If we make it here, no color at the specified index was found!
        return false
    }

    public getColourMarkers() {
        // Extract new line markers
        let output: ColourMarker[] = []
        for (let marker of markers) {
            if (marker instanceof ColourMarker) {
                output.push(marker)
            }
        }
        return output
    }

    /**
     * Call to get a list of all the new line markers.
     * @return A list of all the new line markers.
     */
    public getNewLineMarkers() {
        //return newLineMarkers;

        // Extract new line markers
        let output: NewLineMarker[] = []
        for (let marker of markers) {
            if (marker instanceof NewLineMarker) {
                output.push(marker)
            }
        }
        return output
    }

    public getTimeStampMarkers() {
        //return newLineMarkers;

        // Extract new line markers
        let output: TimeStampMarker[] = []
        for (let marker of markers) {
            if (marker instanceof TimeStampMarker) {
                output.push(marker)
            }
        }
        return output
    }

    /**
     * Shifts as much data as it can from the <code>input</code> to this <code>StreamedData</code> object,
     * until a partial match (a mutli-character regex pattern) is detected in the input.
     * <p>
     * Internally uses the <code>shiftDataIn()</code> method to actually move data.
     * <p>
     * Used by the <code>{@link ninja.mbedded.ninjaterm.util.rxProcessing.newLineParser.NewLineParser}</code>
     *
     * @param input   The input <code>StreamedData</code> object to shift data from.
     * @param pattern The regex pattern that defines a match.
     */
    public shiftCharsInUntilPartialMatch(input: StreamedData, pattern: RegExp) {

        let firstCharAfterLastFullMatch = 0;
        let currPositionInString = 0;

        // Look for index of partial match
        let startIndexOfPartialMatch = -1;
        while ((startIndexOfPartialMatch == -1) && (currPositionInString <= (input.getText().length - 1))) {

            // Matcher matcher = pattern.matcher(input.getText().substring(currPositionInString));
            // input.getText().substring(currPositionInString).test(pattern)
            throw Error('Needs implementing/testing!')
            let partialMatchRegex = pattern.toPartialMatchRegex()
            let result = partialMatchRegex.exec(input.getText().substring(currPositionInString))

            matcher.matches();
            if (matcher.hitEnd()) {
                startIndexOfPartialMatch = currPositionInString;
            }

            // Remove first character from input and try again
            currPositionInString++;
        }

        // There might be remaining input after the last ANSI escpe code has been processed.
        // This can all be put in the last text node, which should be by now set up correctly.
        if (startIndexOfPartialMatch == -1) {
            // let charsToAppend = input.getText().substring(firstCharAfterLastFullMatch);
            this.shiftDataIn(input, input.getText().length, MarkerBehaviour.NOT_FILTERING);
        } else {
            this.shiftDataIn(input, startIndexOfPartialMatch, MarkerBehaviour.NOT_FILTERING);
        }
    }

    /**
     * Splits the text up at the new lines as specified by the new line markers.
     * <p>
     * Does not modify the <code>StreamedData</code> object.
     *
     * @return
     */
    public splitTextAtNewLines() {

        // Work out how many strings there will be
        let numOfLines = this.getNewLineMarkers().length + 1

        let lines: string[] = Array(numOfLines)

        let startIndex = 0;
        for (let i = 0; i < numOfLines; i++) {

            if (i == numOfLines - 1) {
                lines[i] = this.getText().substring(startIndex, this.getText().length)
            } else {
                lines[i] = this.getText().substring(startIndex, this.getNewLineMarkers()[i].getCharPos())
                startIndex = this.getNewLineMarkers()[i].getCharPos()
            }

        }

        return lines
    }

    /**
     * Removes the character at the provided character index. This is a "safe" remove operation, and
     * makes sure that all colour and new line markers after the char that is removed are shifted appropriately.
     * <p>
     * Also removes any markers that point to that char.
     *
     * @param charIndex The 0-based index of the character in the StreamedText object that you wish to remove.
     */
    public removeChar(charIndex: number, deleteNewLines: boolean) {

        if (charIndex >= this.getText().length) {
            throw Error("charIndex pointed outside of length of text.")
        }

        // Remove the character from the text
        let oldText = this.text;

        this.text = oldText.substring(0, charIndex) + oldText.substring(charIndex + 1, oldText.length)

        //==============================================//
        //============ DELETE/SHIFT MARKERS ============//
        //==============================================//

        // Shift all new line markers from the deleted char onwards
        let length = this.markers.length
        for (let i = 0; i < length; i++) {
            let element = this.markers[i]

            if(deleteNewLines) {
                if(element.charPos == charIndex + 1 && element instanceof NewLineMarker) {
                    this.markers.splice(i, 1)
                    i--
                }
            }

            if (element.charPos == charIndex && element.association == Association.CHAR_ON) {
                // Remove this marker
                this.markers.splice(i, 1)
                i--
            } /*else if (element.charPos == charIndex + 1 && element.association == Marker.Association.SPACE_BEFORE) {
                // Remove marker that points to the space between deleted char and the one after it
                iter.remove();
            }*/ else if (charIndex == 0 && element.charPos == 0 && element.association == Association.SPACE_BEFORE) {
                // If we are removing the first char, and the marker is something like a
                // new line, delete it
                this.markers.splice(i, 1)
                i--
            } else if (element.getCharPos() != 0 && element.getCharPos() >= charIndex) {
                element.setCharPos(element.getCharPos() - 1);
            }
        }

    }

//    /**
//     * Converts a Streamed object into a string with the provided new line character sequence
//     * inserted at the appropriate places as determined by the new line markers.
//     * <p>
//     * On a windows system, the typical new line sequence for logging to a file is "\r\n".
//     * <p>
//     * Does not modify <code>input</code>.
//     *
//     * @return
//     */
//    public String convertToStringWithNewLines(String newLineCharSeq) {
//
//        StringBuilder output = new StringBuilder();
//
//        output.append(getText());
//
//        int numOfInsertedChars = 0;
//        for (Integer newLineMarker : getNewLineMarkers()) {
//            output.insert(newLineMarker + numOfInsertedChars, newLineCharSeq);
//            numOfInsertedChars += newLineCharSeq.length();
//        }
//
//        return output.toString();
//    }

    /**
     * Trims this StreamedData object as necessary to keep the number of chars no greater than
     * <code>maxNumChars</code>.
     */
    private trimDataIfRequired() {

//        logger.debug("trimDataIfRequired() called.");

        // Check if -1, if so, we don't want to perform any trimming
        if (this.maxNumChars == -1)
            return

        if (this.text.length() > this.maxNumChars {
            let numCharsToRemove = this.text.length - this.maxNumChars;
//            logger.debug("Trimming first" + numCharsToRemove + " characters from StreamedData object.");
            this.removeCharsFromStart(numCharsToRemove, false)
        }
    }

    //================================================================================================//
    //=========================================== GRAVEYARD ==========================================//
    //================================================================================================//

    /*public boolean checkAllNewLinesHaveColors() {

        // Check all characters but the last one (since there can't
        // be any char after this new line to have a color attached to it)
        for(int x = 0; x < text.length() - 1; x++) {

            if (text.charAt(x) != '\n') {
                continue;
            }

            // Look for entry in color array
            if (!isColorAt(x + 1)) {
                logger.debug("The was no color on the line starting at position " + Integer.toString(x + 1) + ".");
                return false;
            }
        }

        // If we make it here, all new lines must of had colors
        return true;
    }*/

}
