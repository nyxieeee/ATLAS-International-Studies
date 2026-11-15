export function folderName(value, folders = [], exceptId = '') {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80) throw Error('Use a folder name between 1 and 80 characters.');
  if (folders.some(f => f.id !== exceptId && f.name.toLowerCase() === name.toLowerCase())) throw Error('A folder with this name already exists.');
  return name;
}
export function inFolder(item, selected) {
  return selected === 'all' || (selected === 'unfiled' ? !item.folderId : item.folderId === selected);
}
export function removeFolder(workspace, id) {
  const unfile = items => (items || []).map(item => item.folderId === id ? {...item, folderId: ''} : item);
  return {...workspace, folders: (workspace.folders || []).filter(f => f.id !== id), references: unfile(workspace.references), materials: unfile(workspace.materials), projects: unfile(workspace.projects)};
}
export function migrateFolders(workspace) {
  const folders = [...(workspace.folders || [])];
  const references = (workspace.references || []).map(ref => {
    const name = String(ref.collection || '').trim();
    if (!name) return ref;
    let folder = folders.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (!folder) {folder = {id: 'legacy-collection:' + encodeURIComponent(name.toLowerCase()), name}; folders.push(folder);}
    return {...ref, folderId: ref.folderId || folder.id, collection: ''};
  });
  return {...workspace, folders, references};
}
