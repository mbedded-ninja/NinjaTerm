package ninja.mbedded.ninjaterm.view.mainWindow.terminal.txRx.macros;

import javafx.fxml.FXMLLoader;
import javafx.geometry.Pos;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.scene.input.MouseButton;
import javafx.scene.input.MouseEvent;
import javafx.stage.Modality;
import javafx.stage.Stage;
import ninja.mbedded.ninjaterm.model.Model;
import ninja.mbedded.ninjaterm.model.terminal.Terminal;
import ninja.mbedded.ninjaterm.model.terminal.txRx.macros.Macro;
import ninja.mbedded.ninjaterm.view.mainWindow.terminal.txRx.macros.macroSettingsWindow.MacroSettingsViewController;
import org.controlsfx.glyphfont.FontAwesome;
import org.controlsfx.glyphfont.GlyphFont;

import java.io.IOException;

/**
 * Represents a single row in the macro GridPane.
 *
 * @author Geoffrey Hunter <gbmhunter@gmail.com> (www.mbedded.ninja)
 * @last-modified 2016-11-08
 * @since 2016-11-05
 */
public class MacroRow {

    Model model;
    Terminal terminal;
    Macro macro;

    public TextField nameTextField = new TextField();
    public TextField sequenceTextField = new TextField();
    public Button sendButton = new Button();

    public MacroRow(Model model, Terminal terminal, Macro macro, GlyphFont glyphFont) {

        this.model = model;
        this.terminal = terminal;
        this.macro = macro;

        nameTextField.setPrefWidth(50);

        sequenceTextField.setPrefWidth(80);

        sendButton.setGraphic(glyphFont.create(FontAwesome.Glyph.SHARE_SQUARE));

        //==============================================//
        //=============== SETUP BINDING ================//
        //==============================================//

        nameTextField.textProperty().bindBidirectional(macro.name);
        sequenceTextField.textProperty().bindBidirectional(macro.sequence);

        //==============================================//
        //======= INSTALL DOUBLE-CLICK HANDLERS ========//
        //==============================================//

        nameTextField.setOnMouseClicked((MouseEvent mouseEvent) -> {
            if (mouseEvent.getButton().equals(MouseButton.PRIMARY)) {
                if (mouseEvent.getClickCount() == 2) {
                    // Create and show the macro settings window
                    showMacroSettingsWindow();
                }
            }
        });

        sequenceTextField.setOnMouseClicked((MouseEvent mouseEvent) -> {
            if (mouseEvent.getButton().equals(MouseButton.PRIMARY)) {
                if (mouseEvent.getClickCount() == 2) {
                    // Create and show the macro settings window
                    showMacroSettingsWindow();
                }
            }
        });

        //==============================================//
        //== NOTIFY MODEL WHEN SEND BUTTON IS PUSHED ===//
        //==============================================//

        sendButton.setOnAction(event -> {
            terminal.txRx.macroManager.sendMacro(macro);
        });


    }

    public void showMacroSettingsWindow() {
        final Stage stage = new Stage();
        stage.initModality(Modality.APPLICATION_MODAL);
        //stage.initOwner(primaryStage);

        FXMLLoader loader = new FXMLLoader(
                getClass().getResource("macroSettingsWindow/MacroSettingsView.fxml"));
        Parent root;
        try {
            root = loader.load();
        } catch (IOException e) {
            return;
        }
        MacroSettingsViewController macroSettingsViewController = loader.getController();


        macroSettingsViewController.init(macro);

        // Blur the main window
        model.isPrimaryStageBlurred.set(true);

        // Make sure main window is un-blurred when dialogue closes
        stage.setOnCloseRequest(event -> {
            model.isPrimaryStageBlurred.set(false);
        });

        // Create a scene and display the dialogue window
        Scene dialogScene = new Scene(root, 300, 200);
        stage.setScene(dialogScene);
        stage.show();
    }
}