package ai.sonderr.client.ui.md

import ai.sonderr.client.session.ui.selection.SessionSelection
import ai.sonderr.client.session.ui.style.SessionEditorStyle

internal class MdViewHybrid(
    style: SessionEditorStyle = SessionEditorStyle.current(),
    selection: SessionSelection? = null,
    code: MdCodeBlockFactory = MdCodeBlockFactory.default(),
) : ai.sonderr.client.ui.md.hybrid.MdViewHybrid(style, selection, code)
