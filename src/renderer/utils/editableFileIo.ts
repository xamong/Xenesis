import type { OpenFileResult, RemoteFileProfile } from '../../shared/types';

export interface EditableFileTarget {
  filePath: string;
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
}

function isRemoteEditableTarget(target: EditableFileTarget): target is EditableFileTarget & {
  remoteFileProfile: RemoteFileProfile;
  remoteFilePath: string;
} {
  return Boolean(target.remoteFileProfile && target.remoteFilePath);
}

export function textToBase64Utf8(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    let chunkText = '';
    for (const byte of chunk) chunkText += String.fromCharCode(byte);
    binary += chunkText;
  }

  return btoa(binary);
}

export async function saveEditableText(target: EditableFileTarget, content: string): Promise<{ saved: boolean }> {
  if (isRemoteEditableTarget(target)) {
    const result = await window.remoteFileAPI.writeFile({
      profile: target.remoteFileProfile,
      remotePath: target.remoteFilePath,
      contentBase64: textToBase64Utf8(content),
      contentMode: 'text',
    });
    return { saved: result.ok };
  }

  return window.fileAPI.saveText(target.filePath, content);
}

export function readEditableText(target: EditableFileTarget): Promise<OpenFileResult | null> {
  if (isRemoteEditableTarget(target)) {
    return window.remoteFileAPI.readFile(target.remoteFileProfile, target.remoteFilePath);
  }

  return window.fileAPI.readFile(target.filePath);
}
