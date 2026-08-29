package ai.sonderr.backend.migration

import ai.sonderr.backend.testing.TestLog
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SonderrBackendLegacyMigrationStoreServiceTest {
    @Test
    fun `status marker survives deleted legacy settings file`() {
        val dir = Files.createTempDirectory("sonderr-migration-config").toFile()
        val env = mapOf("SONDERR_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = SonderrBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.CompletedWithErrors)
        store.cleanup(LegacyCleanupTargets(legacySettingsFile = true))
        SonderrBackendLegacyMigrationStoreService.markStatus(log, LegacyMigrationStatus.Completed, env)

        assertFalse(dir.resolve("legacy-settings.json").exists())
        assertEquals(LegacyMigrationStatus.Completed, SonderrBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `inline completed status is adopted into durable marker`() {
        val dir = Files.createTempDirectory("sonderr-migration-config").toFile()
        val env = mapOf("SONDERR_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = SonderrBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Completed)

        // First read adopts the inline status into the durable marker.
        assertEquals(LegacyMigrationStatus.Completed, SonderrBackendLegacyMigrationStoreService.status(log, env))
        assertTrue(dir.resolve("legacy-migration-status").isFile)

        // The adopted marker then survives deletion of the legacy settings file.
        store.cleanup(LegacyCleanupTargets(legacySettingsFile = true))
        assertFalse(dir.resolve("legacy-settings.json").exists())
        assertEquals(LegacyMigrationStatus.Completed, SonderrBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `inline skipped status is adopted into durable marker`() {
        val dir = Files.createTempDirectory("sonderr-migration-config").toFile()
        val env = mapOf("SONDERR_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = SonderrBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Skipped)

        assertEquals(LegacyMigrationStatus.Skipped, SonderrBackendLegacyMigrationStoreService.status(log, env))
        assertTrue(dir.resolve("legacy-migration-status").isFile)
    }

    @Test
    fun `absent status stays null`() {
        val dir = Files.createTempDirectory("sonderr-migration-config").toFile()
        val env = mapOf("SONDERR_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()

        assertNull(SonderrBackendLegacyMigrationStoreService.status(log, env))
        assertFalse(dir.resolve("legacy-migration-status").exists())
    }

    @Test
    fun `durable completed status is honored while legacy source payload remains`() {
        val dir = Files.createTempDirectory("sonderr-migration-config").toFile()
        val env = mapOf("SONDERR_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = SonderrBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Completed)
        dir.resolve("legacy-settings.json").writeText(
            """{"migrationStatus":"Completed","providerProfiles":"{\"currentApiConfigName\":\"p\",\"apiConfigs\":{}}"}"""
        )
        SonderrBackendLegacyMigrationStoreService.markStatus(log, LegacyMigrationStatus.Completed, env)

        assertEquals(LegacyMigrationStatus.Completed, SonderrBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `reset status deletes durable marker`() {
        val dir = Files.createTempDirectory("sonderr-migration-config").toFile()
        val env = mapOf("SONDERR_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        SonderrBackendLegacyMigrationStoreService.markStatus(log, LegacyMigrationStatus.Completed, env)

        assertEquals(LegacyMigrationStatus.Completed, SonderrBackendLegacyMigrationStoreService.status(log, env))
        assertEquals(true, SonderrBackendLegacyMigrationStoreService.resetStatus(log, env))
        assertNull(SonderrBackendLegacyMigrationStoreService.status(log, env))
    }

    @Test
    fun `reset status clears adopted inline status`() {
        val dir = Files.createTempDirectory("sonderr-migration-config").toFile()
        val env = mapOf("SONDERR_CONFIG_DIR" to dir.absolutePath)
        val log = TestLog()
        val store = SonderrBackendLegacyMigrationStoreService.store(log, env)
        store.mark(LegacyMigrationStatus.Skipped)

        assertEquals(LegacyMigrationStatus.Skipped, SonderrBackendLegacyMigrationStoreService.status(log, env))
        assertEquals(true, SonderrBackendLegacyMigrationStoreService.resetStatus(log, env))
        assertNull(SonderrBackendLegacyMigrationStoreService.status(log, env))
    }
}
