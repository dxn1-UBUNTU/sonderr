package ai.sonderr.client.ui.diagram.ui

import ai.sonderr.client.session.ui.style.SessionEditorStyle
import ai.sonderr.client.ui.UiStyle
import ai.sonderr.client.ui.diagram.FontSpec
import ai.sonderr.client.ui.diagram.Palette
import ai.sonderr.client.ui.diagram.Spec
import ai.sonderr.client.ui.md.MdCommon
import ai.sonderr.client.ui.md.MdStyle

internal fun diagramPalette(style: SessionEditorStyle, opts: MdStyle = MdCommon.defaults(style)) = Palette(
    surface = UiStyle.Colors.contrast(opts.preBg, 8),
    border = opts.codeBorder,
    text = opts.foreground,
    muted = opts.quoteFg,
    accent = opts.linkColor,
    note = opts.quoteBg,
    cluster = opts.codeBorder,
    line = opts.quoteFg,
    font = style.editorFont,
    bold = style.boldEditorFont,
)

internal fun diagramSpec(style: SessionEditorStyle) = Spec(FontSpec(style.editorFamily, style.editorSize))
