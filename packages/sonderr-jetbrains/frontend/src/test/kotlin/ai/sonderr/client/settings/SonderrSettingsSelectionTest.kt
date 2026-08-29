package ai.sonderr.client.settings

import ai.sonderr.client.settings.models.ModelsConfigurable
import ai.sonderr.client.settings.profile.UserProfileConfigurable
import com.intellij.ide.util.PropertiesComponent
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class SonderrSettingsSelectionTest : BasePlatformTestCase() {

    override fun tearDown() {
        try {
            PropertiesComponent.getInstance(project).unsetValue(SonderrSettingsSelection.SELECTED_CONFIGURABLE_KEY)
        } finally {
            super.tearDown()
        }
    }

    fun `test falls back to profile when no last settings page exists`() {
        assertEquals(UserProfileConfigurable.ID, SonderrSettingsSelection.target(project))
    }

    fun `test falls back to profile when last page is not sonderr`() {
        select("preferences.lookFeel")

        assertEquals(UserProfileConfigurable.ID, SonderrSettingsSelection.target(project))
    }

    fun `test keeps last sonderr root page`() {
        select(SonderrSettingsConfigurable.ID)

        assertEquals(SonderrSettingsConfigurable.ID, SonderrSettingsSelection.target(project))
    }

    fun `test keeps last sonderr child page`() {
        select(ModelsConfigurable.ID)

        assertEquals(ModelsConfigurable.ID, SonderrSettingsSelection.target(project))
    }

    private fun select(id: String) {
        PropertiesComponent.getInstance(project).setValue(SonderrSettingsSelection.SELECTED_CONFIGURABLE_KEY, id)
    }
}
