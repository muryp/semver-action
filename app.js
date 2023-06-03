const { execSync } = require('node:child_process');

function getCommitInfo() {
  try {
    const LAST_VER = execSync('git describe --tags --abbrev=0').toString().replace('\n','')
    const GROUP_TAG = LAST_VER === /fatal: No names found, cannot describe anything\./i ? '' : `${LAST_VER}..HEAD`
    if (GROUP_TAG !== '' && execSync(`git log ${LAST_VER}..HEAD`).toString() === '') {
      return false
    }
    const CMD_LOG = `git log --pretty=format:'{%n "title": "%s",%n "body": "%b",%n "username": "%aN",%n "email": "%aE",%n "issueNumber": "%D",%n "date": "%cd",%n "hashCommitShort": "%h",%n "hashCommitLong": "%H"%n},' ${GROUP_TAG}`;
    const LOG_COMMIT = execSync(CMD_LOG);
    if (!LOG_COMMIT) {
      throw new Error('No commit Log...');
    }

    const LOG_COMMIT_STR = LOG_COMMIT.toString();
    const updatedJsonString = LOG_COMMIT_STR.replace(/"body": "(.*?)"/gims, (_, bodyContent) => {
      const replacedBodyContent = bodyContent.replace(/\n/g, "\\n");
      return `"body": "${replacedBodyContent}"`;
    }).replace(/,\s*$/, '');

    const COMMIT_INFO_LIST = JSON.parse(`[${updatedJsonString}]`);
    const REPO_LINK = execSync('git config --get remote.origin.url').toString().replace(/^.*github.com(\/|:)(.*)(\.git|)(\n|)/, '$2')
    const REPO_LINK_END = `https://github.com/${REPO_LINK}`.replace(/\n/gi, '')
    console.log(REPO_LINK_END)

    // replace some obj and add new
    COMMIT_INFO_LIST.forEach((COMMIT_INFO) => {
      // convert date to mm/dd/yyyy
      const DATE = new Date(COMMIT_INFO.date);
      const FORMATTED_DATE = `${DATE.getMonth() + 1}/${DATE.getDate()}/${DATE.getFullYear()}`;
      COMMIT_INFO.date = FORMATTED_DATE;

      // get issue number
      const TITLE = COMMIT_INFO.title;
      const isIssue = TITLE.match(/#(\d+)/);
      if (isIssue) {
        COMMIT_INFO.issueNumber = isIssue[1];
      } else {
        COMMIT_INFO.issueNumber = '';
      }
      COMMIT_INFO.linkCommit = `${REPO_LINK_END}/commit/${COMMIT_INFO.hashCommitLong}`
      COMMIT_INFO.userLink = `https://github.com/${COMMIT_INFO.username}`
    });

    return { repoLink: REPO_LINK_END, lastVer: LAST_VER, commitInfoList: COMMIT_INFO_LIST };
  } catch (err) {
    throw new Error(err);
  }
}

function msgTag(repoLink, listCommit, version) {
  const LIST_FEAT = []
  const LIST_FIX = []
  const LIST_ETC = []
  listCommit.forEach(({ title, issueNumber, linkCommit }) => {
    const ISSUE_NUMBER = issueNumber !== '' ? `[#${issueNumber}](${repoLink}/issue/${issueNumber})` : ''
    const TITLE = `- [${title.replace(/(fix(?:ed)?|feat(?:ure)?)(:|\s:)\s/i, '')}](${linkCommit})${ISSUE_NUMBER}`
    if (title.match(/^feat(?:ure)?/i)) {
      return LIST_FEAT.push(TITLE)
    }
    if (title.match(/^fix(?:ed)?/i)) {
      return LIST_FIX.push(TITLE)
    }
    if (title.match(/^released|beta|merge/i)) {
      return
    }
    return LIST_ETC.push(TITLE)
  })
  const CHANGE_LOG = `
## ${version} - ${listCommit[0].date}
${LIST_FEAT.length == 0 ? '' : '### New Features\n' + LIST_FEAT.map(e => e).join('\n')}
${LIST_FIX.length == 0 ? '' : '### Bug Fixed\n' + LIST_FIX.map(e => e).join('\n')}
${LIST_ETC.length == 0 ? '' : '### Other Change\n' + LIST_ETC.map(e => e).join('\n')}
`
  return CHANGE_LOG
}

/**
 * Commits changes and upgrades the version (tags).
 * This function performs the necessary steps to commit the changes and upgrade the version (tags) accordingly.
 * 
 * @returns {void} This function does not return any value.
 */
function commitAndUpgradeVersion({ repoLink, lastVer, commitInfoList }) {
  const isBreakingChange = commitInfoList.some(({ body }) => body.includes('BREAKING_CHANGE:'));
  const VER = lastVer === '' ? [0, 0, 0] : lastVer.replace(/v/i, '').split('.')
  const isBeta = commitInfoList.some(({ body }) => body.includes('beta:')) ? '-beta' : '';
  if (isBreakingChange) {
    const NEW_VERSION = `v${Number(VER[0]) + 1}.${VER[1]}.${VER[2]}${isBeta}`
    const MSG = msgTag(repoLink, commitInfoList, NEW_VERSION)
    return { MSG, NEW_VERSION }
  }
  const isFeatChange = commitInfoList.some(({ title }) => title.includes('feat') || title.includes('feature'));
  if (isFeatChange) {
    const NEW_VERSION = `v${VER[0]}.${Number(VER[1]) + 1}.${VER[2]}${isBeta}`
    const MSG = msgTag(repoLink, commitInfoList, NEW_VERSION)
    return { MSG, NEW_VERSION }
  }
  const NEW_VERSION = `v${VER[0]}.${VER[1]}.${Number(VER[2]) + 1}${isBeta}`
  const MSG = msgTag(repoLink, commitInfoList, NEW_VERSION)
  return { MSG, NEW_VERSION, isBeta }
}

try {
  const commitInfoList = getCommitInfo();
  const isGHAction = process.env.INPUT_GA
  // cek is can upgrade version or not
  if (!commitInfoList) {
    if (isGHAction === 'true') {
      return execSync(`echo "NEW_TAG=false" >> "$GITHUB_OUTPUT"`)
    }
    return console.log('no commit to be new version')
  }
  const { MSG, NEW_VERSION, isBeta } = commitAndUpgradeVersion(commitInfoList)
  console.log(NEW_VERSION)
  const BETA = isBeta === '-beta' ? 'true' : 'false'
  // cek is on github action
  if (isGHAction === 'true') {
    execSync(`
EOF=$(dd if=/dev/urandom bs=15 count=1 status=none | base64)
echo "MSG<<$EOF" >> "$GITHUB_OUTPUT"
echo "${MSG}" >> "$GITHUB_OUTPUT"
echo "$EOF" >> $GITHUB_OUTPUT
echo "TAG=${NEW_VERSION}" >> "$GITHUB_OUTPUT"
echo "BETA=${BETA}" >> "$GITHUB_OUTPUT"
`)
    return
  }
  // execSync(`git tag ${NEW_VERSION}`)
} catch (error) {
  console.error(error);
}
