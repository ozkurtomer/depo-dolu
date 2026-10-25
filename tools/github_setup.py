"""Preview by default. --apply updates GitHub metadata/issues using the user's gh login.

No commits, branches, releases or pushes are created.
"""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Apply the displayed changes using GitHub CLI')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    spec = json.loads((root / '.github/repository-setup.json').read_text(encoding='utf-8'))
    for issue in spec['issues']:
        path = (root / issue['body_file']).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            parser.error(f"Invalid issue body: {issue['body_file']}")

    print(json.dumps(spec, ensure_ascii=False, indent=2))
    if not args.apply:
        print('\nPreview only. Use --apply after reviewing .github/repository-setup.json.')
        return 0

    gh = shutil.which('gh')
    if not gh:
        parser.error('GitHub CLI (gh) is required. Install it from cli.github.com, then run gh auth login.')

    def run(*command, payload=None):
        result = subprocess.run([gh, *command], cwd=root, input=payload, text=True,
                                encoding='utf-8', capture_output=True)
        if result.returncode:
            raise RuntimeError(result.stderr.strip() or 'GitHub CLI failed')
        return result.stdout

    repo = spec['repository']
    # Verify the logged-in account can read the intended repository before making changes.
    run('repo', 'view', repo, '--json', 'nameWithOwner')
    run('api', '--method', 'PATCH', f'repos/{repo}', '--input', '-',
        payload=json.dumps({k: spec[k] for k in ['description', 'homepage']}))
    run('api', '--method', 'PUT', f'repos/{repo}/topics', '--input', '-',
        payload=json.dumps({'names': spec['topics']}))
    for label in spec['labels']:
        run('label', 'create', label['name'], '--repo', repo, '--color', label['color'],
            '--description', label['description'], '--force')

    existing = json.loads(run('issue', 'list', '--repo', repo, '--state', 'all',
                              '--limit', '1000', '--json', 'number,title'))
    titles = {item['title'] for item in existing}
    for issue in spec['issues']:
        if issue['title'] in titles:
            print(f"Already exists: {issue['title']}")
            continue
        command = ['issue', 'create', '--repo', repo, '--title', issue['title'],
                   '--body-file', str(root / issue['body_file'])]
        for label in issue['labels']:
            command += ['--label', label]
        print(run(*command).strip())
        titles.add(issue['title'])
    print('GitHub metadata and contribution issues applied. No commit or push performed.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
