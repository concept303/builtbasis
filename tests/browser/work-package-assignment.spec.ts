import { test, expect, login, seed } from './fixture';
const origin = 'http://127.0.0.1:3490';
test('inline package creation preserves the record draft and cancellation leaves the package unassigned', async ({ page }) => {
  await login(page); const { projectId } = seed();
  const r=await(await page.request.post(`/api/projects/${projectId}/records`,{headers:{origin},data:{subtype:'detail_clarification',title:'Original title',instructionText:'  Exact\nInstruction  '}})).json();
  await page.goto(`/projects/${projectId}/records/${r.id}`);await page.getByRole('button',{name:'Edit record',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Unsaved title');await page.getByRole('button',{name:'+ New package',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Name (required)').fill('Inline from draft');await dialog.getByRole('button',{name:'Create work package',exact:true}).click();
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Unsaved title');await expect(page.getByLabel('Instruction text',{exact:true})).toHaveValue('  Exact\nInstruction  ');
  await expect(page.getByRole('button',{name:'Choose work package',exact:true})).toContainText('Inline from draft');
  page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect((await(await page.request.get(`/api/projects/${projectId}/records/${r.id}`)).json()).workPackageId).toBeNull();
  const list=await(await page.request.get(`/api/projects/${projectId}/work-packages`)).json();expect(list.packages.some((p:{name:string})=>p.name==='Inline from draft')).toBe(true);
});
test('capture from a package preselects membership without inheriting its person or target',async({page})=>{
  await login(page);const {projectId}=seed();const base=`/api/projects/${projectId}`;
  const p=await(await page.request.post(`${base}/work-packages`,{headers:{origin},data:{name:'Capture package',targetDate:'2030-01-01'}})).json();
  await page.goto(`/projects/${projectId}/work-packages/${p.id}`);await page.getByRole('button',{name:'New record',exact:true}).click();
  await expect(page.getByRole('button',{name:'Choose work package',exact:true})).toContainText('Capture package');
  await page.getByLabel('Subtype',{exact:true}).selectOption('task');await page.getByLabel('Title',{exact:true}).fill('Captured in package');await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByText('Draft saved.',{exact:false})).toBeVisible();
  const result=await(await page.request.get(`${base}/records?workPackageId=${p.id}`)).json();expect(result.records).toHaveLength(1);
  const r=await(await page.request.get(`${base}/records/${result.records[0].id}`)).json();expect(r.workPackageId).toBe(p.id);expect(r.dueDate).toBeNull();expect(r.responsibleId).toBeNull();
});
test('record filter round trips all, ungrouped and a package',async({page})=>{
  await login(page);const {projectId}=seed();const base=`/api/projects/${projectId}`;
  const p=await(await page.request.post(`${base}/work-packages`,{headers:{origin},data:{name:'Filter package'}})).json();
  await page.request.post(`${base}/records`,{headers:{origin},data:{subtype:'task',title:'Filtered member',workPackageId:p.id}});
  await page.goto(`/projects/${projectId}/records`);await page.getByLabel('Work package',{exact:true}).selectOption(String(p.id));await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Filtered member',exact:true})).toBeVisible();expect(new URL(page.url()).searchParams.get('workPackageId')).toBe(String(p.id));
  await page.getByLabel('Work package',{exact:true}).selectOption('none');await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByRole('heading',{name:'Filtered member',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Remove filter: Work package',exact:true}).click();expect(new URL(page.url()).searchParams.has('workPackageId')).toBe(false);
});
