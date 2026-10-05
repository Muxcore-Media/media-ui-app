import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axe } from 'vitest-axe';
import Settings from './Settings';
import { axeOptions } from '../a11y/axe';
import * as client from '../api/client';
import { ALL_CAPABILITIES, CapabilitiesContext, DEFAULT_CAPABILITIES } from '../lib/capabilities';
import { getPreferences } from '../lib/userdata';
import { setCurrentRoles, setCurrentUserId } from '../lib/session';
import * as passkeys from '../lib/passkeys';

const getRequestPolicy = vi.fn();
const updateRequestPolicy = vi.fn();
const getAcquisition = vi.fn();
const createIndexer = vi.fn();
const updateIndexer = vi.fn();
const deleteIndexer = vi.fn();
const getFormats = vi.fn();
const syncTrashGuides = vi.fn();
const scoreRelease = vi.fn();
const parseQuality = vi.fn();
const createQualityProfile = vi.fn();
const updateQualityProfile = vi.fn();
const deleteQualityProfile = vi.fn();
const createCustomFormat = vi.fn();
const updateCustomFormat = vi.fn();
const deleteCustomFormat = vi.fn();
const createReleaseProfile = vi.fn();
const updateReleaseProfile = vi.fn();
const deleteReleaseProfile = vi.fn();
const listDelayProfiles = vi.fn();
const upsertDelayProfile = vi.fn();
const listInvites = vi.fn();
const createInvite = vi.fn();
const revokeInvite = vi.fn();
const listRoots = vi.fn();
const browseRoots = vi.fn();
const createRoot = vi.fn();
const probeRoot = vi.fn();
const pickRoot = vi.fn();
const updateRoot = vi.fn();
const deleteRoot = vi.fn();
const getLibraryScan = vi.fn();
const runLibraryScan = vi.fn();
const listWatchDirs = vi.fn();
const createWatchDir = vi.fn();
const deleteWatchDir = vi.fn();
const updateWatchDir = vi.fn();
const listUsers = vi.fn();
const createUser = vi.fn();
const setUserPassword = vi.fn();
const getTOTP = vi.fn();
const enableTOTP = vi.fn();
const verifyTOTP = vi.fn();
const disableTOTP = vi.fn();
const listPasskeys = vi.fn();
const beginPasskeyRegister = vi.fn();
const completePasskeyRegister = vi.fn();
const deletePasskey = vi.fn();
const setUserRole = vi.fn();
const deleteUser = vi.fn();
const listPasswordResets = vi.fn();
const dismissPasswordReset = vi.fn();
const setPasswordReset = vi.fn();
const listNamingTemplates = vi.fn();
const createNamingTemplate = vi.fn();
const updateNamingTemplate = vi.fn();
const deleteNamingTemplate = vi.fn();
const organizeLibrary = vi.fn();
const listListSources = vi.fn();
const createListSource = vi.fn();
const deleteListSource = vi.fn();
const updateListSource = vi.fn();
const syncListSources = vi.fn();
const syncListSource = vi.fn();
const testListSource = vi.fn();
const listListHistory = vi.fn();
const listListItems = vi.fn();
const migrateArrLibrary = vi.fn();
const importTautulliHistory = vi.fn();
const importJellystatHistory = vi.fn();
const getJellyfinStatus = vi.fn();
const syncJellyfinLibrary = vi.fn();
const refreshJellyfinLibrary = vi.fn();
const getNotifications = vi.fn();
const configureNotification = vi.fn();
const testNotification = vi.fn();
const getWatchNotify = vi.fn();
const upsertWatchNotifyRule = vi.fn();
const deleteWatchNotifyRule = vi.fn();
const upsertWatchNotifyDestination = vi.fn();
const deleteWatchNotifyDestination = vi.fn();
const testWatchNotifyDestination = vi.fn();
const listTags = vi.fn();
const createTag = vi.fn();
const getTagging = vi.fn();
const createTaggingTag = vi.fn();
const upsertTaggingRule = vi.fn();
const deleteTaggingRule = vi.fn();
const classifyTagging = vi.fn();
const listSkipMedia = vi.fn();
const deleteTag = vi.fn();
const listBackups = vi.fn();
const createBackup = vi.fn();
const deleteBackup = vi.fn();
const restoreBackup = vi.fn();
const listAPIKeys = vi.fn();
const createAPIKey = vi.fn();
const rotateAPIKey = vi.fn();
const deleteAPIKey = vi.fn();
const listSubtitleWanted = vi.fn();
const createSubtitleWanted = vi.fn();
const deleteSubtitleWanted = vi.fn();
const searchSubtitleWanted = vi.fn();
const listSubtitleProviders = vi.fn();
const setSubtitleProvider = vi.fn();
const listSubtitleHistory = vi.fn();
const clearSubtitleHistory = vi.fn();
const listSubtitleProfiles = vi.fn();
const listSubtitleLanguages = vi.fn();
const upsertSubtitleProfile = vi.fn();
const listSubtitleBlacklist = vi.fn();
const removeSubtitleBlacklist = vi.fn();
const listSubtitleMedia = vi.fn();
const setSubtitleMedia = vi.fn();
const massEditSubtitleMedia = vi.fn();
const getMaintainer = vi.fn();
const getGuard = vi.fn();
const upsertGuardRule = vi.fn();
const deleteGuardRule = vi.fn();
const ackGuardViolations = vi.fn();
const resetGuardTrust = vi.fn();
const mergeGuardUsers = vi.fn();
const scanMaintainer = vi.fn();
const actMaintainer = vi.fn();
const maintainerCandidateAction = vi.fn();
const upsertMaintainerRule = vi.fn();
const previewMaintainerRule = vi.fn();
const toggleMaintainerRule = vi.fn();
const deleteMaintainerRule = vi.fn();
const upsertMaintainerProtection = vi.fn();
const deleteMaintainerProtection = vi.fn();
const upsertMaintainerCollection = vi.fn();
const deleteMaintainerCollection = vi.fn();
const upsertMaintainerExclusion = vi.fn();
const deleteMaintainerExclusion = vi.fn();
const syncMaintainerExclusions = vi.fn();
const exportMaintainerRules = vi.fn();
const importMaintainerRules = vi.fn();
const listViewerProfiles = vi.fn(async () => ({
  active_id: 'primary',
  profiles: [{ id: 'primary', name: 'Primary', kids: false, pin_set: false }],
}));

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      getRequestPolicy: (...args: unknown[]) => getRequestPolicy(...args),
      updateRequestPolicy: (...args: unknown[]) => updateRequestPolicy(...args),
      getAcquisition: (...args: unknown[]) => getAcquisition(...args),
      createIndexer: (...args: unknown[]) => createIndexer(...args),
      updateIndexer: (...args: unknown[]) => updateIndexer(...args),
      deleteIndexer: (...args: unknown[]) => deleteIndexer(...args),
      getFormats: (...args: unknown[]) => getFormats(...args),
      syncTrashGuides: (...args: unknown[]) => syncTrashGuides(...args),
      scoreRelease: (...args: unknown[]) => scoreRelease(...args),
      parseQuality: (...args: unknown[]) => parseQuality(...args),
      createQualityProfile: (...args: unknown[]) => createQualityProfile(...args),
      updateQualityProfile: (...args: unknown[]) => updateQualityProfile(...args),
      deleteQualityProfile: (...args: unknown[]) => deleteQualityProfile(...args),
      createCustomFormat: (...args: unknown[]) => createCustomFormat(...args),
      updateCustomFormat: (...args: unknown[]) => updateCustomFormat(...args),
      deleteCustomFormat: (...args: unknown[]) => deleteCustomFormat(...args),
      createReleaseProfile: (...args: unknown[]) => createReleaseProfile(...args),
      updateReleaseProfile: (...args: unknown[]) => updateReleaseProfile(...args),
      deleteReleaseProfile: (...args: unknown[]) => deleteReleaseProfile(...args),
      listDelayProfiles: (...args: unknown[]) => listDelayProfiles(...args),
      upsertDelayProfile: (...args: unknown[]) => upsertDelayProfile(...args),
      listInvites: (...args: unknown[]) => listInvites(...args),
      createInvite: (...args: unknown[]) => createInvite(...args),
      revokeInvite: (...args: unknown[]) => revokeInvite(...args),
      listRoots: (...args: unknown[]) => listRoots(...args),
      browseRoots: (...args: unknown[]) => browseRoots(...args),
      createRoot: (...args: unknown[]) => createRoot(...args),
      probeRoot: (...args: unknown[]) => probeRoot(...args),
      pickRoot: (...args: unknown[]) => pickRoot(...args),
      updateRoot: (...args: unknown[]) => updateRoot(...args),
      deleteRoot: (...args: unknown[]) => deleteRoot(...args),
      getLibraryScan: (...args: unknown[]) => getLibraryScan(...args),
      runLibraryScan: (...args: unknown[]) => runLibraryScan(...args),
      listWatchDirs: (...args: unknown[]) => listWatchDirs(...args),
      createWatchDir: (...args: unknown[]) => createWatchDir(...args),
      deleteWatchDir: (...args: unknown[]) => deleteWatchDir(...args),
      updateWatchDir: (...args: unknown[]) => updateWatchDir(...args),
      listUsers: (...args: unknown[]) => listUsers(...args),
      createUser: (...args: unknown[]) => createUser(...args),
      setUserPassword: (...args: unknown[]) => setUserPassword(...args),
      getTOTP: (...args: unknown[]) => getTOTP(...args),
      enableTOTP: (...args: unknown[]) => enableTOTP(...args),
      verifyTOTP: (...args: unknown[]) => verifyTOTP(...args),
      disableTOTP: (...args: unknown[]) => disableTOTP(...args),
      listPasskeys: (...args: unknown[]) => listPasskeys(...args),
      beginPasskeyRegister: (...args: unknown[]) => beginPasskeyRegister(...args),
      completePasskeyRegister: (...args: unknown[]) => completePasskeyRegister(...args),
      deletePasskey: (...args: unknown[]) => deletePasskey(...args),
      setUserRole: (...args: unknown[]) => setUserRole(...args),
      deleteUser: (...args: unknown[]) => deleteUser(...args),
      listPasswordResets: (...args: unknown[]) => listPasswordResets(...args),
      dismissPasswordReset: (...args: unknown[]) => dismissPasswordReset(...args),
      setPasswordReset: (...args: unknown[]) => setPasswordReset(...args),
      listNamingTemplates: (...args: unknown[]) => listNamingTemplates(...args),
      createNamingTemplate: (...args: unknown[]) => createNamingTemplate(...args),
      updateNamingTemplate: (...args: unknown[]) => updateNamingTemplate(...args),
      deleteNamingTemplate: (...args: unknown[]) => deleteNamingTemplate(...args),
      organizeLibrary: (...args: unknown[]) => organizeLibrary(...args),
      listListSources: (...args: unknown[]) => listListSources(...args),
      createListSource: (...args: unknown[]) => createListSource(...args),
      deleteListSource: (...args: unknown[]) => deleteListSource(...args),
      updateListSource: (...args: unknown[]) => updateListSource(...args),
      syncListSources: (...args: unknown[]) => syncListSources(...args),
      syncListSource: (...args: unknown[]) => syncListSource(...args),
      testListSource: (...args: unknown[]) => testListSource(...args),
      listListHistory: (...args: unknown[]) => listListHistory(...args),
      listListItems: (...args: unknown[]) => listListItems(...args),
      migrateArrLibrary: (...args: unknown[]) => migrateArrLibrary(...args),
      importTautulliHistory: (...args: unknown[]) => importTautulliHistory(...args),
      importJellystatHistory: (...args: unknown[]) => importJellystatHistory(...args),
      getJellyfinStatus: (...args: unknown[]) => getJellyfinStatus(...args),
      syncJellyfinLibrary: (...args: unknown[]) => syncJellyfinLibrary(...args),
      refreshJellyfinLibrary: (...args: unknown[]) => refreshJellyfinLibrary(...args),
      getNotifications: (...args: unknown[]) => getNotifications(...args),
      configureNotification: (...args: unknown[]) => configureNotification(...args),
      testNotification: (...args: unknown[]) => testNotification(...args),
      getWatchNotify: (...args: unknown[]) => getWatchNotify(...args),
      upsertWatchNotifyRule: (...args: unknown[]) => upsertWatchNotifyRule(...args),
      deleteWatchNotifyRule: (...args: unknown[]) => deleteWatchNotifyRule(...args),
      upsertWatchNotifyDestination: (...args: unknown[]) => upsertWatchNotifyDestination(...args),
      deleteWatchNotifyDestination: (...args: unknown[]) => deleteWatchNotifyDestination(...args),
      testWatchNotifyDestination: (...args: unknown[]) => testWatchNotifyDestination(...args),
      listTags: (...args: unknown[]) => listTags(...args),
      createTag: (...args: unknown[]) => createTag(...args),
      getTagging: (...args: unknown[]) => getTagging(...args),
      createTaggingTag: (...args: unknown[]) => createTaggingTag(...args),
      upsertTaggingRule: (...args: unknown[]) => upsertTaggingRule(...args),
      deleteTaggingRule: (...args: unknown[]) => deleteTaggingRule(...args),
      classifyTagging: (...args: unknown[]) => classifyTagging(...args),
      listSkipMedia: (...args: unknown[]) => listSkipMedia(...args),
      deleteTag: (...args: unknown[]) => deleteTag(...args),
      listBackups: (...args: unknown[]) => listBackups(...args),
      createBackup: (...args: unknown[]) => createBackup(...args),
      deleteBackup: (...args: unknown[]) => deleteBackup(...args),
      restoreBackup: (...args: unknown[]) => restoreBackup(...args),
      listAPIKeys: (...args: unknown[]) => listAPIKeys(...args),
      createAPIKey: (...args: unknown[]) => createAPIKey(...args),
      rotateAPIKey: (...args: unknown[]) => rotateAPIKey(...args),
      deleteAPIKey: (...args: unknown[]) => deleteAPIKey(...args),
      listSubtitleWanted: (...args: unknown[]) => listSubtitleWanted(...args),
      createSubtitleWanted: (...args: unknown[]) => createSubtitleWanted(...args),
      deleteSubtitleWanted: (...args: unknown[]) => deleteSubtitleWanted(...args),
      searchSubtitleWanted: (...args: unknown[]) => searchSubtitleWanted(...args),
      listSubtitleProviders: (...args: unknown[]) => listSubtitleProviders(...args),
      setSubtitleProvider: (...args: unknown[]) => setSubtitleProvider(...args),
      listSubtitleHistory: (...args: unknown[]) => listSubtitleHistory(...args),
      clearSubtitleHistory: (...args: unknown[]) => clearSubtitleHistory(...args),
      listSubtitleProfiles: (...args: unknown[]) => listSubtitleProfiles(...args),
      listSubtitleLanguages: (...args: unknown[]) => listSubtitleLanguages(...args),
      upsertSubtitleProfile: (...args: unknown[]) => upsertSubtitleProfile(...args),
      listSubtitleBlacklist: (...args: unknown[]) => listSubtitleBlacklist(...args),
      removeSubtitleBlacklist: (...args: unknown[]) => removeSubtitleBlacklist(...args),
      listSubtitleMedia: (...args: unknown[]) => listSubtitleMedia(...args),
      setSubtitleMedia: (...args: unknown[]) => setSubtitleMedia(...args),
      massEditSubtitleMedia: (...args: unknown[]) => massEditSubtitleMedia(...args),
      getMaintainer: (...args: unknown[]) => getMaintainer(...args),
      getGuard: (...args: unknown[]) => getGuard(...args),
      upsertGuardRule: (...args: unknown[]) => upsertGuardRule(...args),
      deleteGuardRule: (...args: unknown[]) => deleteGuardRule(...args),
      ackGuardViolations: (...args: unknown[]) => ackGuardViolations(...args),
      resetGuardTrust: (...args: unknown[]) => resetGuardTrust(...args),
      mergeGuardUsers: (...args: unknown[]) => mergeGuardUsers(...args),
      scanMaintainer: (...args: unknown[]) => scanMaintainer(...args),
      actMaintainer: (...args: unknown[]) => actMaintainer(...args),
      maintainerCandidateAction: (...args: unknown[]) => maintainerCandidateAction(...args),
      upsertMaintainerRule: (...args: unknown[]) => upsertMaintainerRule(...args),
      previewMaintainerRule: (...args: unknown[]) => previewMaintainerRule(...args),
      toggleMaintainerRule: (...args: unknown[]) => toggleMaintainerRule(...args),
      deleteMaintainerRule: (...args: unknown[]) => deleteMaintainerRule(...args),
      upsertMaintainerProtection: (...args: unknown[]) => upsertMaintainerProtection(...args),
      deleteMaintainerProtection: (...args: unknown[]) => deleteMaintainerProtection(...args),
      upsertMaintainerCollection: (...args: unknown[]) => upsertMaintainerCollection(...args),
      deleteMaintainerCollection: (...args: unknown[]) => deleteMaintainerCollection(...args),
      upsertMaintainerExclusion: (...args: unknown[]) => upsertMaintainerExclusion(...args),
      deleteMaintainerExclusion: (...args: unknown[]) => deleteMaintainerExclusion(...args),
      syncMaintainerExclusions: (...args: unknown[]) => syncMaintainerExclusions(...args),
      exportMaintainerRules: (...args: unknown[]) => exportMaintainerRules(...args),
      importMaintainerRules: (...args: unknown[]) => importMaintainerRules(...args),
      listViewerProfiles: () => listViewerProfiles(),
    },
  };
});

function renderSettings(path = '/settings', caps = DEFAULT_CAPABILITIES) {
  return render(
    <CapabilitiesContext.Provider
      value={{ caps, loading: false, error: null, retry: () => {} }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('Settings page', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentRoles([]);
    setCurrentUserId('');
    getRequestPolicy.mockReset();
    updateRequestPolicy.mockReset();
    getAcquisition.mockReset();
    createIndexer.mockReset();
    updateIndexer.mockReset();
    deleteIndexer.mockReset();
    getFormats.mockReset();
    syncTrashGuides.mockReset();
    scoreRelease.mockReset();
    parseQuality.mockReset();
    createQualityProfile.mockReset();
    updateQualityProfile.mockReset();
    deleteQualityProfile.mockReset();
    createCustomFormat.mockReset();
    updateCustomFormat.mockReset();
    deleteCustomFormat.mockReset();
    createReleaseProfile.mockReset();
    updateReleaseProfile.mockReset();
    deleteReleaseProfile.mockReset();
    listDelayProfiles.mockReset();
    upsertDelayProfile.mockReset();
    listInvites.mockReset();
    createInvite.mockReset();
    revokeInvite.mockReset();
    listRoots.mockReset();
    browseRoots.mockReset();
    createRoot.mockReset();
    probeRoot.mockReset();
    pickRoot.mockReset();
    updateRoot.mockReset();
    deleteRoot.mockReset();
    getLibraryScan.mockReset();
    runLibraryScan.mockReset();
    getLibraryScan.mockResolvedValue({
      available: true,
      scanner: true,
      status: 'idle',
      lastScanAt: '2023-11-14T22:13:20Z',
      watchDirs: 2,
      totalImported: 12,
      lastFound: 4,
      lastImported: 3,
      lastSkipped: 1,
      lastError: '',
    });
    runLibraryScan.mockResolvedValue({
      type: 'watch',
      filesFound: 5,
      filesImported: 4,
      filesSkipped: 1,
      message: 'watch scan complete — found=5 imported=4 skipped=1',
    });
    listWatchDirs.mockReset();
    createWatchDir.mockReset();
    deleteWatchDir.mockReset();
    updateWatchDir.mockReset();
    listWatchDirs.mockResolvedValue({
      available: true,
      dirs: [{ id: 'wd1', path: '/downloads', mediaType: 'both', libraryPath: '/data/movies', enabled: true, createdAt: '' }],
    });
    createWatchDir.mockResolvedValue({
      id: 'wd-new',
      path: '/data/uhd',
      mediaType: 'movie',
      libraryPath: '/data/movies',
      enabled: true,
      createdAt: '',
    });
    deleteWatchDir.mockResolvedValue({ removed: true, id: 'wd1' });
    updateWatchDir.mockResolvedValue({
      id: 'wd1',
      path: '/downloads',
      mediaType: 'both',
      libraryPath: '/data/movies',
      enabled: false,
      createdAt: '',
    });
    listUsers.mockReset();
    createUser.mockReset();
    getTOTP.mockReset();
    enableTOTP.mockReset();
    verifyTOTP.mockReset();
    disableTOTP.mockReset();
    listPasskeys.mockReset();
    beginPasskeyRegister.mockReset();
    completePasskeyRegister.mockReset();
    deletePasskey.mockReset();
    setUserPassword.mockReset();
    setUserRole.mockReset();
    deleteUser.mockReset();
    listPasswordResets.mockReset();
    dismissPasswordReset.mockReset();
    setPasswordReset.mockReset();
    listPasswordResets.mockResolvedValue({ available: true, count: 0, requests: [] });
    dismissPasswordReset.mockResolvedValue({ ok: true, id: 'req1' });
    setPasswordReset.mockResolvedValue({ ok: true, id: 'req1', user_id: 'u1' });
    listNamingTemplates.mockReset();
    createNamingTemplate.mockReset();
    updateNamingTemplate.mockReset();
    deleteNamingTemplate.mockReset();
    organizeLibrary.mockReset();
    listListSources.mockReset();
    createListSource.mockReset();
    deleteListSource.mockReset();
    updateListSource.mockReset();
    syncListSources.mockReset();
    syncListSource.mockReset();
    testListSource.mockReset();
    listListHistory.mockReset();
    listListItems.mockReset();
    migrateArrLibrary.mockReset();
    importTautulliHistory.mockReset();
    importJellystatHistory.mockReset();
    getJellyfinStatus.mockReset();
    syncJellyfinLibrary.mockReset();
    refreshJellyfinLibrary.mockReset();
    getNotifications.mockReset();
    configureNotification.mockReset();
    testNotification.mockReset();
    getWatchNotify.mockReset();
    upsertWatchNotifyRule.mockReset();
    deleteWatchNotifyRule.mockReset();
    upsertWatchNotifyDestination.mockReset();
    deleteWatchNotifyDestination.mockReset();
    testWatchNotifyDestination.mockReset();
    listTags.mockReset();
    createTag.mockReset();
    getTagging.mockReset();
    createTaggingTag.mockReset();
    upsertTaggingRule.mockReset();
    deleteTaggingRule.mockReset();
    classifyTagging.mockReset();
    listSkipMedia.mockReset();
    deleteTag.mockReset();
    listBackups.mockReset();
    createBackup.mockReset();
    deleteBackup.mockReset();
    restoreBackup.mockReset();
    listAPIKeys.mockReset();
    createAPIKey.mockReset();
    rotateAPIKey.mockReset();
    deleteAPIKey.mockReset();
    listSubtitleWanted.mockReset();
    createSubtitleWanted.mockReset();
    deleteSubtitleWanted.mockReset();
    searchSubtitleWanted.mockReset();
    listSubtitleProviders.mockReset();
    setSubtitleProvider.mockReset();
    listSubtitleHistory.mockReset();
    clearSubtitleHistory.mockReset();
    listSubtitleProfiles.mockReset();
    listSubtitleLanguages.mockReset();
    upsertSubtitleProfile.mockReset();
    listSubtitleBlacklist.mockReset();
    removeSubtitleBlacklist.mockReset();
    listSubtitleMedia.mockReset();
    setSubtitleMedia.mockReset();
    massEditSubtitleMedia.mockReset();
    getMaintainer.mockReset();
    getGuard.mockReset();
    upsertGuardRule.mockReset();
    deleteGuardRule.mockReset();
    ackGuardViolations.mockReset();
    resetGuardTrust.mockReset();
    mergeGuardUsers.mockReset();
    scanMaintainer.mockReset();
    actMaintainer.mockReset();
    maintainerCandidateAction.mockReset();
    upsertMaintainerRule.mockReset();
    previewMaintainerRule.mockReset();
    toggleMaintainerRule.mockReset();
    deleteMaintainerRule.mockReset();
    upsertMaintainerProtection.mockReset();
    deleteMaintainerProtection.mockReset();
    upsertMaintainerCollection.mockReset();
    deleteMaintainerCollection.mockReset();
    upsertMaintainerExclusion.mockReset();
    deleteMaintainerExclusion.mockReset();
    syncMaintainerExclusions.mockReset();
    exportMaintainerRules.mockReset();
    importMaintainerRules.mockReset();
    listTags.mockResolvedValue({
      available: true,
      tags: [{ id: 'm1', label: '4K', media: 'movie', createdAt: '' }],
    });
    createTag.mockResolvedValue({ id: 'm-new', label: 'kids', media: 'movie', createdAt: '' });
    getTagging.mockResolvedValue({
      available: true,
      tags: [{ id: 't1', name: 'Kids', category: 'audience', color: '' }],
      rules: [{ id: 'r1', tagId: 't1', field: 'title', match: 'contains', pattern: 'Paw Patrol', enabled: true }],
    });
    createTaggingTag.mockResolvedValue({ id: 't1', name: 'Kids', category: 'audience', color: '' });
    upsertTaggingRule.mockResolvedValue({
      id: 'r1', tagId: 't1', field: 'title', match: 'contains', pattern: 'Paw Patrol', enabled: true,
    });
    deleteTaggingRule.mockResolvedValue({ ok: true, id: 'r1' });
    classifyTagging.mockResolvedValue({ mediaId: 'm1', tags: [{ id: 't1', name: 'Kids', category: 'audience', color: '' }], matchedRuleIds: ['r1'] });
    listSkipMedia.mockResolvedValue({ available: false, items: [], total: 0 });
    deleteTag.mockResolvedValue({ removed: true, id: 'm1' });
    listBackups.mockResolvedValue({
      available: true,
      restoreDir: '/data/restore',
      backups: [{ id: 'backup_1', createdAt: '2024-01-02T03:04:05Z', sizeBytes: 2048, modules: [], checksum: 'abc' }],
    });
    createBackup.mockResolvedValue({ id: 'backup_new', createdAt: '', sizeBytes: 512, modules: [], checksum: '' });
    deleteBackup.mockResolvedValue({ removed: true, id: 'backup_1' });
    restoreBackup.mockResolvedValue({ ok: true, id: 'backup_1', filesRestored: 4, restoreDir: '/data/restore' });
    listAPIKeys.mockResolvedValue({
      available: true,
      keys: [{ id: 'tok1', name: 'laptop', prefix: 'mct_abc', userId: 'u1', username: 'pat', scopes: [], createdAt: '', lastUsed: '' }],
    });
    createAPIKey.mockResolvedValue({
      key: { id: 'tok-new', name: 'tv', prefix: 'mct_new', userId: 'u1', username: 'pat', scopes: [], createdAt: '', lastUsed: '' },
      secret: 'mct_copyonce',
    });
    rotateAPIKey.mockResolvedValue({
      key: { id: 'tok2', name: 'laptop', prefix: 'mct_rot', userId: 'u1', username: 'pat', scopes: [], createdAt: '', lastUsed: '' },
      secret: 'mct_rotated',
    });
    deleteAPIKey.mockResolvedValue({ removed: true, id: 'tok1' });
    listSubtitleWanted.mockResolvedValue({
      available: true,
      total: 1,
      wanted: [{ id: 'w1', mediaId: 'm1', title: 'Interstellar', language: 'eng', mediaType: 'movie', season: 0, episode: 0, imdbId: '', tmdbId: 0 }],
    });
    createSubtitleWanted.mockResolvedValue({
      id: 'w-new', mediaId: 'm-new', title: 'Dune', language: 'eng', mediaType: 'movie', season: 0, episode: 0, imdbId: '', tmdbId: 0,
    });
    deleteSubtitleWanted.mockResolvedValue({ removed: true, id: 'w1' });
    searchSubtitleWanted.mockResolvedValue({ searched: 1, downloaded: 0 });
    listSubtitleProviders.mockResolvedValue({
      available: true,
      providers: [{ id: 'opensubtitles', name: 'OpenSubtitles', enabled: true, implemented: true }],
    });
    setSubtitleProvider.mockResolvedValue({ ok: true, id: 'opensubtitles', enabled: false });
    listSubtitleHistory.mockResolvedValue({
      available: true,
      total: 1,
      history: [{ id: 'h1', title: 'Interstellar', language: 'eng', provider: 'opensubtitles', action: 'download', score: 0, createdAt: '' }],
    });
    clearSubtitleHistory.mockResolvedValue({ cleared: true });
    listSubtitleProfiles.mockResolvedValue({
      available: true,
      profiles: [
        { id: 'lp_default', name: 'English', languages: [{ language: 'eng', hearingImpaired: false, forced: false }], isDefault: true },
        { id: 'lp_hi', name: 'English+HI', languages: [{ language: 'eng', hearingImpaired: true, forced: false }], isDefault: false },
      ],
    });
    listSubtitleLanguages.mockResolvedValue({
      available: true,
      languages: [
        { code: 'eng', name: 'English' },
        { code: 'spa', name: 'Spanish' },
      ],
    });
    upsertSubtitleProfile.mockResolvedValue({
      id: 'lp-new', name: 'English+HI', languages: [{ language: 'eng', hearingImpaired: true, forced: false }], isDefault: true,
    });
    listSubtitleBlacklist.mockResolvedValue({
      available: true,
      total: 1,
      entries: [{ id: 'bl1', title: 'Dune.2021.1080p', provider: 'opensubtitles', language: 'eng', reason: 'wrong hash', fileId: '', createdAt: '' }],
    });
    removeSubtitleBlacklist.mockResolvedValue({ removed: true, id: 'bl1' });
    listSubtitleMedia.mockResolvedValue({
      available: true,
      total: 2,
      items: [
        { id: 'mov1', title: 'Dune', mediaType: 'movie', monitored: true, languageProfileId: 'lp_default', season: 0, episode: 0, seriesId: '', seriesName: '', year: 2021, hasFile: true },
        { id: 'ep1', title: 'Pilot', mediaType: 'episode', monitored: true, languageProfileId: 'lp_default', season: 1, episode: 1, seriesId: 'show1', seriesName: 'Severance', year: 0, hasFile: true },
        { id: 'ep2', title: 'Half Loop', mediaType: 'episode', monitored: true, languageProfileId: 'lp_default', season: 1, episode: 2, seriesId: 'show1', seriesName: 'Severance', year: 0, hasFile: true },
      ],
    });
    setSubtitleMedia.mockResolvedValue({ ok: true, id: 'mov1' });
    massEditSubtitleMedia.mockResolvedValue({ ok: true, updated: 2 });
    getGuard.mockResolvedValue({
      available: true,
      rules: [{ id: 'r1', type: 'concurrent_streams', name: 'Two streams', enabled: true, params: { max_streams: '2' } }],
      violations: [{ id: 'v1', ruleId: 'r1', ruleType: 'concurrent_streams', userId: 'u1', userName: 'pat', summary: 'pat has 3 active streams', severity: 'warning', acknowledged: false, createdAt: '' }],
      trust: [{ userId: 'u1', userName: 'pat', score: 80, updatedAt: '' }],
    });
    upsertGuardRule.mockResolvedValue({ id: 'r1', type: 'concurrent_streams', name: 'Two streams', enabled: true, params: { max_streams: '2' } });
    deleteGuardRule.mockResolvedValue({ ok: true, id: 'r1' });
    ackGuardViolations.mockResolvedValue({ updated: 1 });
    resetGuardTrust.mockResolvedValue({ userId: 'u1', userName: 'pat', score: 100, updatedAt: '' });
    mergeGuardUsers.mockResolvedValue({ violationsUpdated: 2, aliasesCreated: 1, sessionsUpdated: 3 });
    getMaintainer.mockResolvedValue({
      available: true,
      total: 1,
      rulesTotal: 1,
      candidates: [{
        id: 'c1', itemId: 'm1', title: 'Old Movie', year: 1999, tmdbId: 0, imdbId: '',
        scope: 'movie', status: 'pending', arrAction: 'delete', sizeBytes: 1024,
        addedAt: '', actAfter: '', error: '', collection: '',
      }],
      runs: [],
      rules: [{
        id: 'rule1', name: 'Unwatched 90d', enabled: true, scope: 'movie', outcome: 'candidate',
        arrAction: 'delete', definitionJson: '', autoActEnabled: false, autoActDelayDays: 0, maxActionsPerRun: 50,
        collectionId: 'col1',
      }],
      collections: [{
        id: 'col1', name: 'Leaving soon', enabled: true, graceDays: 7, arrAction: 'delete',
        leavingSoonEnabled: true, leavingSoonLabel: 'Leaving Soon', createdAt: '', updatedAt: '',
      }],
      exclusions: [{
        id: 'excl1', name: 'Favorites', type: 'local', listUrl: '', hasApiKey: false,
        tmdbIds: [550], tmdbCount: 1, lastSynced: '', createdAt: '',
      }],
      protections: [{
        id: 'p1', itemId: 'm1', title: 'Fight Club', reason: 'Household favorite', scope: 'movie', expiresAt: '', createdAt: '',
      }],
      storage: [{ path: '/data/movies', freePercent: 8.5, freeBytes: 20, totalBytes: 200, libraryBytes: 0, itemCount: 4 }],
    });
    scanMaintainer.mockResolvedValue({ ok: true, dryRun: true, candidatesFound: 2, run: { id: 'r1', kind: 'scan', status: 'ok', candidatesFound: 2, actionsTaken: 0, actionsFailed: 0, dryRun: true, error: '', startedAt: '', completedAt: '' } });
    actMaintainer.mockResolvedValue({ ok: true, actionsTaken: 1, run: { id: 'r2', kind: 'act', status: 'ok', candidatesFound: 0, actionsTaken: 1, actionsFailed: 0, dryRun: false, error: '', startedAt: '', completedAt: '' } });
    upsertMaintainerRule.mockResolvedValue({
      id: 'rule-new', name: 'Stale unwatched movies', enabled: true, scope: 'movie', outcome: 'candidate',
      arrAction: 'delete', definitionJson: '', autoActEnabled: false, autoActDelayDays: 0, maxActionsPerRun: 50,
    });
    previewMaintainerRule.mockResolvedValue({ total: 1, matches: [{ id: 'c1', title: 'Old Movie' }] });
    toggleMaintainerRule.mockResolvedValue({
      id: 'rule1', name: 'Unwatched 90d', enabled: false, scope: 'movie', outcome: 'candidate',
      arrAction: 'delete', definitionJson: '', autoActEnabled: false, autoActDelayDays: 0, maxActionsPerRun: 50,
    });
    deleteMaintainerRule.mockResolvedValue({ removed: true, id: 'rule1' });
    upsertMaintainerProtection.mockResolvedValue({
      id: 'p-new', itemId: 'm2', title: 'Dune', reason: 'Household favorite', scope: 'movie', expiresAt: '', createdAt: '',
    });
    deleteMaintainerProtection.mockResolvedValue({ removed: true, id: 'p1' });
    upsertMaintainerCollection.mockResolvedValue({
      id: 'col-new', name: 'Leaving soon movies', enabled: true, graceDays: 14, arrAction: 'delete',
      leavingSoonEnabled: true, leavingSoonLabel: 'Leaving Soon', createdAt: '', updatedAt: '',
    });
    deleteMaintainerCollection.mockResolvedValue({ removed: true, id: 'col1' });
    upsertMaintainerExclusion.mockResolvedValue({
      id: 'excl-new', name: 'Never delete', type: 'local', listUrl: '', hasApiKey: false,
      tmdbIds: [550, 603], tmdbCount: 2, lastSynced: '', createdAt: '',
    });
    deleteMaintainerExclusion.mockResolvedValue({ removed: true, id: 'excl1' });
    syncMaintainerExclusions.mockResolvedValue({ listsSynced: 1, idsLoaded: 2 });
    exportMaintainerRules.mockResolvedValue({ rulesJson: '[]', rulesYaml: 'name: Unwatched 90d\n' });
    importMaintainerRules.mockResolvedValue({ imported: 1 });
    maintainerCandidateAction.mockResolvedValue({
      id: 'c1', itemId: 'm1', title: 'Old Movie', year: 1999, tmdbId: 0, imdbId: '',
      scope: 'movie', status: 'approved', arrAction: 'delete', sizeBytes: 1024,
      addedAt: '', actAfter: '', error: '', collection: '',
    });
    getNotifications.mockResolvedValue({
      available: true,
      channels: [{ id: 'discord', enabled: true, description: 'Discord', lastError: '', lastSuccessAt: '' }],
    });
    configureNotification.mockResolvedValue({ configured: true, channel: 'slack' });
    testNotification.mockResolvedValue({ ok: true, channel: 'discord' });
    getWatchNotify.mockResolvedValue({
      available: true,
      rules: [
        {
          id: 'nr1',
          name: 'Session start',
          enabled: true,
          eventType: 'playback.started',
          titleTemplate: 'Playback started',
          messageTemplate: '{user} started watching "{title}"',
          severity: 'info',
          filters: { userIds: [], platforms: [], mediaTypes: [], transcodeOnly: false, minDurationSec: 0 },
          destinationIds: ['d1'],
        },
      ],
      destinations: [
        {
          id: 'd1',
          name: 'Family Discord',
          type: 'discord',
          enabled: true,
          config: { webhook_url: '********' },
          events: ['playback.started'],
        },
      ],
    });
    upsertWatchNotifyRule.mockResolvedValue({
      id: 'nr1',
      name: 'Someone started watching',
      enabled: true,
      eventType: 'playback.started',
      titleTemplate: 'Playback started',
      messageTemplate: '{user} started watching "{title}"',
      severity: 'info',
      filters: { userIds: [], platforms: [], mediaTypes: [], transcodeOnly: false, minDurationSec: 0 },
      destinationIds: [],
    });
    deleteWatchNotifyRule.mockResolvedValue({ ok: true, id: 'nr1' });
    upsertWatchNotifyDestination.mockResolvedValue({
      id: 'd1', name: 'Family Discord', type: 'discord', enabled: true, config: {}, events: ['playback.started'],
    });
    deleteWatchNotifyDestination.mockResolvedValue({ ok: true, id: 'd1' });
    testWatchNotifyDestination.mockResolvedValue({ ok: true, id: 'd1' });
    importTautulliHistory.mockResolvedValue({
      imported: 0,
      skipped: 3,
      failed: 0,
      totalFetched: 3,
      error: '',
      dryRun: true,
    });
    importJellystatHistory.mockResolvedValue({
      imported: 1,
      skipped: 0,
      failed: 0,
      totalFetched: 1,
      error: '',
      dryRun: true,
    });
    getJellyfinStatus.mockResolvedValue({
      available: true,
      configured: true,
      baseUrl: 'https://jellyfin.example',
      conflictMode: 'jellyfin',
      itemLinks: 12,
      sessionsPollEnabled: true,
      userdataSync: true,
      sseConnected: false,
      error: '',
    });
    syncJellyfinLibrary.mockResolvedValue({
      available: true,
      direction: 'jellyfin',
      dryRun: true,
      scanned: 40,
      matched: 12,
      upserted: 3,
      removed: 1,
      errors: [],
    });
    refreshJellyfinLibrary.mockResolvedValue({ ok: true, itemId: '' });
    migrateArrLibrary.mockResolvedValue({
      dryRun: true,
      fetched: 1,
      imported: 0,
      skipped: 0,
      errors: [],
      preview: [
        {
          source: 'radarr',
          arrId: 10,
          title: 'Fight Club',
          year: 1999,
          tmdbId: 550,
          tvdbId: 0,
          musicbrainzId: '',
          monitored: true,
          qualityProfileName: 'HD-1080p',
          rootFolderPath: '/data/movies',
        },
      ],
      scanNote: '',
    });
    listListSources.mockResolvedValue({
      available: true,
      sources: [{ id: 'ls1', name: 'Trakt watchlist', type: 'trakt', enabled: true, username: '', clientId: '', listUrl: '', syncIntervalMinutes: 1440, lastSynced: '', baseUrl: '', qualityProfileId: '', rootFolderPath: '', hasApiKey: false }],
    });
    createListSource.mockResolvedValue({
      id: 'ls-new',
      name: 'IMDb Top',
      type: 'imdb',
      enabled: true,
      username: '',
      clientId: '',
      listUrl: 'https://imdb.com/list/1',
      syncIntervalMinutes: 1440,
      lastSynced: '',
      baseUrl: '',
      qualityProfileId: 'qp1',
      rootFolderPath: '/data/movies',
      hasApiKey: false,
    });
    deleteListSource.mockResolvedValue({ removed: true, id: 'ls1' });
    updateListSource.mockResolvedValue({
      id: 'ls1',
      name: 'Trakt watchlist',
      type: 'trakt',
      enabled: false,
      username: '',
      clientId: '',
      listUrl: '',
      syncIntervalMinutes: 1440,
      lastSynced: '',
      baseUrl: '',
      qualityProfileId: '',
      rootFolderPath: '',
      hasApiKey: false,
    });
    syncListSources.mockResolvedValue({ started: true, itemsFound: 12, itemsNew: 3 });
    syncListSource.mockResolvedValue({ started: true, id: 'ls1', itemsFound: 4, itemsNew: 1 });
    testListSource.mockResolvedValue({ ok: true, id: 'ls1', message: 'Found 4 titles', itemsFound: 4 });
    listListHistory.mockResolvedValue({
      available: true,
      total: 1,
      entries: [
        {
          id: 'log1',
          sourceId: 'ls1',
          sourceName: 'Trakt watchlist',
          status: 'ok',
          itemsFound: 12,
          itemsNew: 3,
          error: '',
          startedAt: '2026-09-08T10:00:00Z',
          completedAt: '',
        },
      ],
    });
    listListItems.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: 'it1',
          sourceId: 'ls1',
          title: 'Fight Club',
          year: 1999,
          mediaType: 'movie',
          status: 'added',
          action: 'watchlist',
          tmdbId: 550,
          imdbId: '',
          matchedItemId: '',
        },
      ],
    });
    listNamingTemplates.mockResolvedValue({
      available: true,
      templates: [
        {
          id: 'movie_tpl',
          name: 'Default Movie',
          mediaType: 'movie',
          pattern: '{Title} ({Year})/{Title} ({Year}) [{Quality}]',
          isDefault: true,
          updatedAt: '',
        },
      ],
    });
    createNamingTemplate.mockResolvedValue({
      id: 'tpl-new',
      name: 'UHD',
      mediaType: 'tv',
      pattern: '{Title}/{Title}',
      isDefault: false,
      updatedAt: '',
    });
    updateNamingTemplate.mockResolvedValue({
      id: 'movie_tpl',
      name: 'Movies',
      mediaType: 'movie',
      pattern: '{Title} ({Year})',
      isDefault: true,
      updatedAt: '',
    });
    deleteNamingTemplate.mockResolvedValue({ removed: true, id: 'movie_tpl' });
    organizeLibrary.mockResolvedValue({
      available: true,
      directory: '/data/movies',
      mediaType: 'movie',
      dryRun: true,
      total: 1,
      renamed: 1,
      errors: 0,
      items: [{ original: 'Fight.Club.1999.mkv', renamedTo: '/data/movies/Fight Club (1999).mkv', success: true, error: '' }],
    });
    getTOTP.mockResolvedValue({ available: true, enabled: false, verified: false, secret: '', qrCodeUrl: '' });
    enableTOTP.mockResolvedValue({
      available: true,
      enabled: true,
      verified: false,
      secret: 'SECRETBASE32',
      qrCodeUrl: 'otpauth://totp/MuxCore:sam?secret=SECRETBASE32',
    });
    verifyTOTP.mockResolvedValue({ available: true, enabled: true, verified: true, secret: '', qrCodeUrl: '' });
    disableTOTP.mockResolvedValue({ available: true, enabled: false, verified: false, secret: '', qrCodeUrl: '' });
    listPasskeys.mockResolvedValue({
      available: true,
      passkeys: [{ id: 'cred1', credentialType: 'public-key', transports: '', createdAt: '2026-09-08T00:00:00Z', lastUsedAt: '' }],
    });
    beginPasskeyRegister.mockResolvedValue({
      available: true,
      options: { publicKey: { challenge: 'chal-1', user: { id: 'dXNlcg', name: 'sam', displayName: 'sam' } } },
      challenge: 'chal-1',
    });
    completePasskeyRegister.mockResolvedValue({ registered: true });
    deletePasskey.mockResolvedValue({ removed: true, id: 'cred1' });
    listUsers.mockResolvedValue({
      available: true,
      users: [{ id: 'u1', username: 'pat', roles: ['user'], totpEnabled: false, createdAt: '' }],
    });
    createUser.mockResolvedValue({ id: 'u2', username: 'sam', roles: ['viewer'], totpEnabled: false, createdAt: '' });
    setUserPassword.mockResolvedValue({ ok: true, id: 'u1' });
    setUserRole.mockResolvedValue({ id: 'u1', username: 'pat', roles: ['viewer'], totpEnabled: false, createdAt: '' });
    deleteUser.mockResolvedValue({ removed: true, id: 'u1' });
    listInvites.mockResolvedValue({ available: true, invites: [] });
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r1', path: '/data/movies', name: 'Movies', mediaKind: 'movies', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    browseRoots.mockImplementation(async (next: unknown) => {
      const path = String(next || '/');
      return {
        available: true,
        path,
        parent: path === '/' ? '' : '/data',
        entries: path === '/' || path === '/data' ? [{ name: 'uhd', path: '/data/uhd', isDir: true }] : [],
      };
    });
    createRoot.mockResolvedValue({
      id: 'r2',
      path: '/data/uhd',
      name: 'UHD',
      mediaKind: 'movies',
      accessible: true,
      freeBytes: 0,
      totalBytes: 0,
      isDefault: false,
    });
    probeRoot.mockResolvedValue({
      available: true,
      path: '/data/uhd',
      accessible: true,
      freeBytes: 120_000_000_000,
      totalBytes: 500_000_000_000,
      error: '',
    });
    updateRoot.mockResolvedValue({
      id: 'r1',
      path: '/data/movies',
      name: '4K Movies',
      mediaKind: 'movies',
      accessible: true,
      freeBytes: 0,
      totalBytes: 0,
      isDefault: true,
    });
    deleteRoot.mockResolvedValue({ removed: true, id: 'r1' });
    createInvite.mockResolvedValue({
      id: 'inv1',
      prefix: 'abcd',
      createdBy: 'admin',
      role: 'viewer',
      maxUses: 1,
      useCount: 0,
      expiresAt: '2026-09-15T00:00:00Z',
      revoked: false,
      joinUrl: 'https://media.example/invite/tok',
    });
    revokeInvite.mockResolvedValue({ revoked: true });
    listDelayProfiles.mockResolvedValue({
      available: true,
      profiles: [
        { protocol: 'torrent', waitMinutes: 15 },
        { protocol: 'usenet', waitMinutes: 0 },
      ],
    });
    upsertDelayProfile.mockImplementation(async (input: { protocol: string; waitMinutes: number }) => input);
    getFormats.mockResolvedValue({
      available: true,
      formats: [{ id: 'cf1', name: 'Remux-1080p', score: 1850, ruleCount: 1, rules: [{ field: 'title', op: 'contains', value: 'REMUX', negate: false }] }],
      profiles: [{ id: 'qp1', name: 'HD Bluray + WEB', minScore: 0, cutoffScore: 10000, upgradeAllowed: true, upgradeDelayMinutes: 0, formatScores: {} }],
      releaseProfiles: [
        {
          id: 'rpg1',
          name: 'Default Blocklist',
          preferred: ['bluray'],
          mustContain: [],
          mustNotContain: ['cam'],
          preferredScore: 15,
          enabled: true,
        },
      ],
    });
    createReleaseProfile.mockResolvedValue({
      id: 'rpg-new',
      name: 'No CAM',
      preferred: [],
      mustContain: [],
      mustNotContain: ['cam'],
      preferredScore: 10,
      enabled: true,
    });
    updateReleaseProfile.mockResolvedValue({
      id: 'rpg1',
      name: 'Default Blocklist',
      preferred: ['bluray'],
      mustContain: [],
      mustNotContain: ['cam', 'telesync'],
      preferredScore: 15,
      enabled: false,
    });
    deleteReleaseProfile.mockResolvedValue({ removed: true, id: 'rpg1' });
    createQualityProfile.mockResolvedValue({
      id: 'qp-new',
      name: 'UHD',
      minScore: 0,
      cutoffScore: 15000,
      upgradeAllowed: true,
      upgradeDelayMinutes: 0,
      formatScores: {},
    });
    updateQualityProfile.mockResolvedValue({
      id: 'qp1',
      name: 'HD Bluray + WEB',
      minScore: 0,
      cutoffScore: 12000,
      upgradeAllowed: true,
      upgradeDelayMinutes: 0,
      formatScores: { cf1: 1850 },
    });
    deleteQualityProfile.mockResolvedValue({ removed: true, id: 'qp1' });
    createCustomFormat.mockResolvedValue({
      id: 'cf-new',
      name: 'HDR',
      score: 500,
      ruleCount: 1,
      rules: [{ field: 'title', op: 'contains', value: 'HDR', negate: false }],
    });
    updateCustomFormat.mockResolvedValue({
      id: 'cf1',
      name: 'Remux-1080p',
      score: 2000,
      ruleCount: 1,
      rules: [{ field: 'title', op: 'contains', value: 'REMUX', negate: false }],
    });
    deleteCustomFormat.mockResolvedValue({ removed: true, id: 'cf1' });
    syncTrashGuides.mockResolvedValue({
      available: true,
      formats: [{ id: 'cf1', name: 'Remux-1080p', score: 1850, ruleCount: 1, rules: [{ field: 'title', op: 'contains', value: 'REMUX', negate: false }] }],
      profiles: [{ id: 'qp1', name: 'HD Bluray + WEB', minScore: 0, cutoffScore: 10000, upgradeAllowed: true, upgradeDelayMinutes: 0, formatScores: {} }],
      releaseProfiles: [],
      sync: { formatsUpserted: 8, formatsSkipped: 0, profilesUpserted: 3, guidesPath: 'embedded:guides-fixture', warnings: [] },
    });
    scoreRelease.mockResolvedValue({
      totalScore: 2000,
      qualityScore: 150,
      formatScore: 1850,
      matches: [{ id: 'cf1', name: 'Remux-1080p', score: 1850 }],
      quality: { label: '1080p Remux', resolution: '1080p', source: 'Remux', codec: '', hdr: false, score: 150 },
    });
    parseQuality.mockResolvedValue({
      label: '1080p Remux',
      resolution: '1080p',
      source: 'Remux',
      codec: 'hevc',
      hdr: true,
      score: 150,
    });
    createIndexer.mockResolvedValue({ id: 9, name: 'Knaben', protocol: 'torrent', language: 'en', configured: true });
    updateIndexer.mockResolvedValue({ id: 3, name: 'Knaben', protocol: 'torrent', language: 'en', configured: false });
    deleteIndexer.mockResolvedValue(undefined);
    getAcquisition.mockResolvedValue({
      ready: false,
      hasIndexer: true,
      hasDownloader: false,
      liveGrabAllowed: true,
      downloaderMode: 'fixture',
      indexerMode: 'fixture',
      vpn: { configured: false, confPresent: false },
      message: 'An indexer is up, but no downloader is connected.',
      peers: [
        { id: 'idx', kind: 'indexer', label: 'Pirate Bay indexer', live: true },
        { id: 'qbit', kind: 'downloader', label: 'qBittorrent', live: false },
        { id: 'indexer-torznab', kind: 'indexer', label: 'Prowlarr / Jackett', live: true },
      ],
      indexersAvailable: true,
      indexers: [{ id: 3, name: 'Knaben', protocol: 'torrent', language: 'en', configured: true }],
      capabilitiesAvailable: true,
      capabilities: {
        supportsSearch: true,
        supportsMovieSearch: true,
        supportsTvSearch: true,
        supportsMusicSearch: false,
        supportsBookSearch: false,
        supportsIdSearch: true,
        supportsSeasonPack: true,
        supportedCategories: [],
        supportedProtocols: ['torrent'],
      },
    });
    getRequestPolicy.mockResolvedValue({
      maxPendingPerUser: 2,
      maxPerWeek: 5,
      autoApproveUsers: ['sam'],
      canEdit: true,
    });
  });

  it('renders profile pane by default', async () => {
    renderSettings();
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    const logout = screen.getByRole('button', { name: /log out/i });
    expect(logout).toHaveAttribute('type', 'button');
    const signOutSpy = vi.spyOn(client, 'signOut').mockResolvedValue();
    fireEvent.click(logout);
    expect(signOutSpy).toHaveBeenCalledTimes(1);
    signOutSpy.mockRestore();
    expect(await screen.findByTestId('settings-totp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable authenticator' })).toBeInTheDocument();
  });

  it('has no axe violations on the profile pane', async () => {
    const { container } = render(
      <main>
        <CapabilitiesContext.Provider
          value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
        >
          <MemoryRouter initialEntries={['/settings']}>
            <Routes>
              <Route path="/settings/*" element={<Settings />} />
            </Routes>
          </MemoryRouter>
        </CapabilitiesContext.Provider>
      </main>,
    );
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(await screen.findByTestId('settings-totp')).toBeInTheDocument();
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it('enables and verifies a household authenticator', async () => {
    renderSettings();
    fireEvent.click(await screen.findByRole('button', { name: 'Enable authenticator' }));
    expect(await screen.findByTestId('totp-secret')).toHaveTextContent('SECRETBASE32');
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify authenticator' }));
    expect(await screen.findByRole('button', { name: 'Disable authenticator' })).toBeInTheDocument();
    expect(verifyTOTP).toHaveBeenCalledWith('123456');
  });

  it('lists and removes a household passkey', async () => {
    renderSettings();
    expect(await screen.findByTestId('settings-passkeys')).toBeInTheDocument();
    expect(screen.getByText(/Passkey added/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(deletePasskey).toHaveBeenCalledWith('cred1');
    });
  });

  it('registers a household passkey through the browser helper', async () => {
    vi.spyOn(passkeys, 'passkeySupported').mockReturnValue(true);
    vi.spyOn(passkeys, 'createBrowserPasskey').mockResolvedValue({ id: 'cred-new', type: 'public-key' });
    renderSettings();
    fireEvent.click(await screen.findByRole('button', { name: 'Add passkey' }));
    await waitFor(() => {
      expect(beginPasskeyRegister).toHaveBeenCalled();
      expect(completePasskeyRegister).toHaveBeenCalledWith('chal-1', { id: 'cred-new', type: 'public-key' });
    });
  });

  it('renders home feed toggles including recently added', () => {
    renderSettings('/settings/home');
    expect(screen.getByText('Recently added')).toBeInTheDocument();
    expect(screen.getByText('Continue watching')).toBeInTheDocument();
  });

  it('persists recently added home preference', () => {
    renderSettings('/settings/home');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Recently added' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(getPreferences().home.showRecentlyAdded).toBe(false);
  });

  it('persists Want to Watch home preference', () => {
    renderSettings('/settings/home');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Want to Watch shelf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(getPreferences().home.showWantToWatch).toBe(false);
  });

  it('marks the active settings section with aria-current', () => {
    renderSettings('/settings/display');
    expect(screen.getByRole('link', { name: 'Display' })).toHaveAttribute('aria-current', 'page');
  });

  it('labels each settings pane with a section heading', () => {
    renderSettings('/settings/playback');
    expect(screen.getByRole('heading', { level: 2, name: 'Playback' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Auto-skip intro and recap' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Auto-skip outro and credits' })).toBeInTheDocument();
    expect(screen.getByLabelText('Audio delay (ms)')).toBeInTheDocument();
  });

  it('persists household audio delay', () => {
    renderSettings('/settings/playback');
    fireEvent.change(screen.getByLabelText('Audio delay (ms)'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(getPreferences().playback.audioOffsetMs).toBe(500);
  });

  it('lists titles that already have skip points', async () => {
    listSkipMedia.mockResolvedValue({ available: true, items: [{ id: 'm1' }], total: 1 });
    renderSettings('/settings/playback');
    expect(await screen.findByTestId('skip-media-list')).toHaveTextContent('m1');
    expect(screen.getByRole('link', { name: 'm1' })).toHaveAttribute('href', '/search?q=m1');
  });

  it('persists household parental controls and a PIN', async () => {
    setCurrentUserId('household-1');
    const { findByTestId } = renderSettings('/settings/parental');
    expect(await findByTestId('settings-parental')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Parental' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Kids mode' }));
    fireEvent.change(screen.getByLabelText('Maximum rating'), { target: { value: 'PG' } });
    fireEvent.change(screen.getByLabelText('Blocked tags'), { target: { value: 'horror' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow unrated titles' }));
    fireEvent.change(screen.getByLabelText('New PIN (4–6 digits)'), { target: { value: '2468' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.getByTestId('parental-flash')).toHaveTextContent('Parental controls saved');
    });
    const parental = getPreferences().parental;
    expect(parental.kidsMode).toBe(true);
    expect(parental.maxRating).toBe('PG');
    expect(parental.blockedTags).toBe('horror');
    expect(parental.allowUnrated).toBe(false);
    expect(parental.pinEnabled).toBe(true);
    expect(parental.pinHash).toHaveLength(64);
  });

  it('rejects a short parental PIN', async () => {
    const { findByTestId } = renderSettings('/settings/parental');
    expect(await findByTestId('settings-parental')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New PIN (4–6 digits)'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('PIN must be 4–6 digits');
    expect(getPreferences().parental.pinEnabled).toBe(false);
  });

  it('does not offer household request quotas to an approver', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/requests', ALL_CAPABILITIES);
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Requests' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-requests')).not.toBeInTheDocument();
  });

  it('shows live indexer and downloader peers', async () => {
    const { findByTestId } = renderSettings('/settings/acquisition');
    expect(await findByTestId('settings-acquisition')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acquisition' })).toBeInTheDocument();
    expect(await screen.findByText('Pirate Bay indexer')).toBeInTheDocument();
    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
    expect(screen.getByText('Not running')).toBeInTheDocument();
    expect(await screen.findByTestId('indexer-list')).toHaveTextContent('Knaben');
    expect(await screen.findByTestId('indexer-capabilities')).toHaveTextContent('Season packs');
    expect(screen.getByTestId('indexer-capabilities')).toHaveTextContent('ID search');
    expect(await screen.findByTestId('acquisition-vpn')).toHaveTextContent(/fixture grab/i);
  });

  it('lets admins add a Prowlarr Torznab indexer', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/acquisition');
    fireEvent.change(await screen.findByLabelText('Indexer name'), { target: { value: 'Knaben' } });
    fireEvent.change(screen.getByLabelText('Indexer URL'), { target: { value: 'https://knaben.example/api' } });
    fireEvent.change(screen.getByLabelText('Indexer API key'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /add indexer/i }));
    await waitFor(() => {
      expect(createIndexer).toHaveBeenCalledWith({
        name: 'Knaben',
        base_url: 'https://knaben.example/api',
        api_key: 'secret',
        implementation: 'torznab',
        enable: true,
      });
    });
  });

  it('does not offer quality profiles or formats to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/quality', ALL_CAPABILITIES);
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quality' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-quality')).not.toBeInTheDocument();
  });

  it('does not offer grab delay profiles to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/delay', ALL_CAPABILITIES);
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Delay' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-delay')).not.toBeInTheDocument();
  });

  it('does not offer invites or API keys to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/invites');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Invites' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'API keys' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-invites')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-keys')).not.toBeInTheDocument();
  });

  it('does not offer libraries, import, or tags to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/libraries');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    for (const name of ['Libraries', 'Import', 'Tags']) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByTestId('library-root-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-migrate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-tags')).not.toBeInTheDocument();
  });

  it('does not offer playback guard to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/guard');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Guard' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-guard')).not.toBeInTheDocument();
  });

  it('does not offer library maintainer to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/maintainer');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Maintainer' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-maintainer')).not.toBeInTheDocument();
  });

  it('does not offer import lists to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/lists');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Lists' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-lists')).not.toBeInTheDocument();
  });

  it('does not offer naming or organize to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/naming');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Naming' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-naming')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-organize')).not.toBeInTheDocument();
  });

  it('does not offer household backups to an admin', async () => {
    setCurrentRoles(['admin']);
    renderSettings('/settings/backups');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Backups' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-backups')).not.toBeInTheDocument();
  });

  it('keeps personal subtitle preferences and hides operator controls', async () => {
    setCurrentRoles(['admin']);
    const { findByTestId } = renderSettings('/settings/subtitles');
    expect(await findByTestId('settings-subtitles')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subtitles' })).toBeInTheDocument();
    expect(screen.getByLabelText('Text color')).toHaveValue('#ffffff');
    expect(screen.getByLabelText('Sync offset (ms)')).toHaveValue(0);
    expect(screen.queryByTestId('subtitle-wanted-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('subtitle-provider-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('subtitle-language-catalog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('subtitle-library-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('subtitle-history-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('subtitle-blacklist-list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add wanted' })).not.toBeInTheDocument();
  });

  it('saves a household Connect webhook', async () => {
    setCurrentRoles(['admin']);
    const { findByTestId } = renderSettings('/settings/notifications');
    expect(await findByTestId('settings-notifications')).toBeInTheDocument();
    expect(await findByTestId('notify-channels')).toHaveTextContent('discord');
    fireEvent.change(screen.getByLabelText('Connect channel'), { target: { value: 'slack' } });
    fireEvent.change(screen.getByLabelText('Connect webhook URL'), { target: { value: 'https://hooks.example/s' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save channel' }));
    await waitFor(() => {
      expect(configureNotification).toHaveBeenCalledWith({
        channel: 'slack',
        webhookUrl: 'https://hooks.example/s',
        smtpHost: undefined,
        smtpPort: undefined,
        smtpUser: undefined,
        smtpPass: undefined,
        smtpFrom: undefined,
        to: undefined,
        enabled: true,
      });
    });
    expect(await findByTestId('notify-flash')).toHaveTextContent('Connect channel saved');
  });

  it('saves a household watch-start alert', async () => {
    setCurrentRoles(['admin']);
    const { findByTestId } = renderSettings('/settings/notifications');
    expect(await findByTestId('watch-notify-rules')).toHaveTextContent('Session start');
    fireEvent.click(screen.getByRole('button', { name: 'Save watch alert' }));
    await waitFor(() => {
      expect(upsertWatchNotifyRule).toHaveBeenCalledWith({
        name: 'Someone started watching',
        enabled: true,
        eventType: 'playback.started',
        titleTemplate: 'Playback started',
        messageTemplate: '{user} started watching "{title}"',
        destinationIds: [],
        filters: { transcodeOnly: false, platforms: [] },
      });
    });
    expect(await findByTestId('notify-flash')).toHaveTextContent('Watch alert saved');
  });


  it('does not offer household user management to an admin', async () => {
    setCurrentRoles(['admin']);
    setCurrentUserId('admin-1');
    renderSettings('/settings/users');
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-users')).not.toBeInTheDocument();
  });
});
