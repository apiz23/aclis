-- ACLIS seed — generated from extracted CSV data
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING

-- ── 1. MUKIM (10 rows) ──────────────────────
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000001', 'BENUT') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000002', 'SUNGAI PINGGAN') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000003', 'AYER BALOI') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000004', 'API-API') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000005', 'PONTIAN') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000006', 'RIMBA TERJUN') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000007', 'AYER MASIN') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000008', 'SUNGAI KARANG') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000009', 'SERKAT') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_mukim (id, name) VALUES ('10000000-0000-0000-0000-000000000010', 'JERAM BATU & PENGKALAN RAJA') ON CONFLICT (id) DO NOTHING;

-- ── 2. KAMPUNG (93 rows) ──────────────────────
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('b13c620c-57e8-4052-a306-f1230da08d23', 'Kampung BNT-01', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('ede0e6c6-0de8-4808-abd8-31e1615a0bf6', 'Kampung BNT-02', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('efef2dac-f3a0-40f0-be63-11d7174ca862', 'Kampung BNT-03', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('266fceb1-b92a-4781-b006-3487a94a1a5d', 'Kampung BNT-04', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('6d0c862f-1148-4817-8dc8-9601783832c4', 'Kampung BNT-05', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('f6f23132-f970-454e-8b75-42a1fad0afc8', 'Kampung BNT-06', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('e889d907-293b-4873-afb6-adb89cbede56', 'Kampung BNT-07', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('333b37ba-294a-4fed-bc06-ae43763d3c57', 'Kampung BNT-08', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('0cf7ef90-b9e1-46cf-a60f-1cffccd2f2b3', 'Kampung BNT-09', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('5ce21154-ef31-49f2-ba27-c240a847dca9', 'Kampung BNT-10', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('b92a286b-4ea0-4f23-a03c-115554d0fd9a', 'Kampung BNT-11', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('6cfb6ea9-7eff-44fe-aa5f-b8545a42480c', 'Kampung BNT-12', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('8c2c291e-a45c-415e-b1da-e260b6663fd5', 'Kampung BNT-13', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('2f346ce4-7d56-4892-a309-f4a37830da45', 'Kampung BNT-14', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('f949c86b-4965-470a-b943-ccd9998fd915', 'Kampung SUNG-01', '10000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('1bf0770f-fdbd-4230-872a-f7c7fe96277c', 'Kampung SUNG-02', '10000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('b1df61f6-f74a-4b4a-a78c-57fb094a53d8', 'Kampung SUNG-03', '10000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('6bae8d03-e6b2-4b39-8458-8881bd554c21', 'Kampung SUNG-04', '10000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('b8fe716f-80b1-48f1-9329-80fd2474d256', 'Kampung SUNG-05', '10000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('66870dcd-f861-45cd-b219-35c6861e2f22', 'Kampung SUNG-06', '10000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('f660d9d3-ca2f-4461-bdc1-0bd12aaa2160', 'Kampung SUNG-07', '10000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('a219298c-5267-4c1f-8c32-9ab87715f64c', 'Kampung AB-01', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('4d719de9-6bd5-4c34-ad9d-cfe40395f383', 'Kampung AB-02', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('ef208f4a-fdf1-4f47-903f-7de68bc45a65', 'Kampung AB-03', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('e436b133-4f10-41be-82a8-4853d6095aaa', 'Kampung AB-04', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('7c174437-2850-4feb-8256-efa1c4a6ff90', 'Kampung AB-05', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('02673143-e762-45dd-9337-a1b204fb1616', 'Kampung AB-06', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('36dc9b2c-ac6c-4c5c-aa71-0b430a4ba16f', 'Kampung AB-07', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('f2c64589-0afc-49d6-8bb3-ae6ebd0efb3a', 'Kampung AB-08', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('15f6d112-730b-4875-8b34-694442e83dcc', 'Kampung AB-09', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('788d77e0-7852-454f-8adf-7e5b47240a75', 'Kampung AB-10', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('31f65ae5-e270-42a6-8230-1d145663605d', 'Kampung AB-11', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('0d4f2dec-f2c4-4eaf-847f-c244b9c2488e', 'Kampung AA-01', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('e9d47cc4-bebc-41e2-ae13-56a95c53be45', 'Kampung AA-02', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('0088cf10-8a66-40a6-8367-2697b2eca1cb', 'Kampung AA-03', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('d1798846-ccf0-4d71-80d0-5d07cbd460be', 'Kampung AA-04', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('92dee776-a29b-461d-ad67-c32f0931d4ad', 'Kampung AA-05', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('2b4d3f32-c042-468a-ac9a-34c9eb9646f1', 'Kampung AA-06', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('533726ce-d226-4903-aa20-564210077c0f', 'Kampung AA-07', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('e68e4c36-a9ff-40b6-86d5-0f1c365b4c73', 'Kampung AA-08', '10000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('9217fdae-1589-4df9-9359-a011c86b2cb2', 'Kampung PTN-01', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('b0d98d30-7497-4d86-a244-ddb25ea0c173', 'Kampung PTN-02', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('ce9a1243-8f16-4f62-9530-0bed76b18874', 'Kampung PTN-03', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('3d36c55c-be8b-4b69-b4bc-8f8417a08563', 'Kampung PTN-04', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('bf176dd0-a3e3-4d03-8bf7-9222f00f1864', 'Kampung PTN-05', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('d1b71e15-d231-452c-a372-5e210fc8961b', 'Kampung PTN-06', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('02bb6e71-c9a7-4109-b9b6-0de1acaacc4d', 'Kampung PTN-07', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('29bd97f4-7b0d-4fc0-9661-1b0be6724495', 'Kampung PTN-08', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('066e5b8b-444e-4677-8536-1000df1a8215', 'Kampung PTN-09', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('ac847045-a49b-4811-ac5c-3c66cc6a5a5e', 'Kampung PTN-10', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('e9566e97-ab76-4c69-af3a-6c705e941c68', 'Kampung PTN-11', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('6fa46c60-21e5-4bd5-b19b-675fe5cccb20', 'Kampung PTN-12', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('d7135d40-997f-44df-8de2-23a69c6c1df9', 'Kampung PTN-13', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('60938ba5-7aad-463a-b25e-a6485bdc7391', 'Kampung PTN-14', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('0975d168-9bee-4493-afbd-d960b2107a05', 'Kampung PTN-15', '10000000-0000-0000-0000-000000000005') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('f4249977-64f8-46fa-9a20-a894876a0926', 'Kampung RT-01', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('d1370bf0-a30e-4556-b66a-7dd15f21413b', 'Kampung RT-02', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('27c46a07-55d8-4905-ad34-070e486b847b', 'Kampung RT-03', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('218087d8-9260-4405-bd2b-bf268aae0526', 'Kampung RT-04', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('edc1d727-a31d-4345-a67f-62be4e4c4e5b', 'Kampung RT-05', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('5263d810-919b-4072-b1a6-018198ece5b9', 'Kampung RT-06', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('2ba648bc-547f-40ad-8431-9b101e23297b', 'Kampung RT-07', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('fda807ad-26d5-4ba4-8cbd-e04cad725076', 'Kampung RT-08', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('17eb04b8-13a6-4274-8a37-a45e379bef7a', 'Kampung RT-09', '10000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('7702a67d-6885-4d42-abb3-10a0ee9f079c', 'Kampung AM-01', '10000000-0000-0000-0000-000000000007') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('20fc5f73-a141-4c2a-aad4-e68a57d7c059', 'Kampung AM-02', '10000000-0000-0000-0000-000000000007') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('c91c565a-bf18-4299-9dc9-dd9f632e1f31', 'Kampung AM-03', '10000000-0000-0000-0000-000000000007') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('2835110c-9fb3-488b-b24a-09001f895b66', 'Kampung SK-01', '10000000-0000-0000-0000-000000000008') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('39b21dd9-1b74-43c3-be1f-0f8dd0d58013', 'Kampung SK-02', '10000000-0000-0000-0000-000000000008') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('09140c01-f53d-462b-a871-555c19e60cf0', 'Kampung SK-03', '10000000-0000-0000-0000-000000000008') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('6fd3c9e9-214b-43e0-a60e-66d1eae760bc', 'Kampung SK-04', '10000000-0000-0000-0000-000000000008') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('46e3e073-576e-43f9-a664-3988126479d4', 'Kampung SKT-01', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('681835b9-76d0-412c-a53d-73e9d7a8a4ae', 'Kampung SKT-02', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('f593c677-ee6c-4fa0-b8af-189ca9e5b028', 'Kampung SKT-03', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('836ce29a-caad-41f1-b0fb-130389dc3482', 'Kampung SKT-04', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('b13a6408-c5e6-438d-9557-dec589a73e34', 'Kampung SKT-05', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('639e059b-df6d-4a71-86b0-ef1ffe5ea134', 'Kampung SKT-06', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('84beee41-11e5-474a-b737-3eef33254b95', 'Kampung SKT-07', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('403dce65-0a23-4e89-93ca-8f6c5e102efa', 'Kampung SKT-08', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('60e43994-e39a-4f5a-8d18-5348200d5433', 'Kampung JBPR-02', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('0c1633cb-acec-4f4a-8a4e-97c5ab4b9648', 'Kampung JBPR-03', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('5d538979-c6bd-48f3-b0ac-2bcb34e0b9c5', 'Kampung JBPR-04', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('a48c20a3-e4dd-42b6-a6ab-5b22f2569902', 'Kampung JBPR-05', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('8406294b-f60a-4e09-b885-6ce7c7ecdd5f', 'Kampung JBPR-06', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('eb3f39cb-7b05-4d49-bfa6-50346312006b', 'Kampung JBPR-07', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('791aa69f-eb0c-4bf3-b1db-7418c39b91f2', 'Kampung JBPR-08', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('8879a62c-e5c6-41e8-902b-8c5b232f5bd1', 'Kampung JBPR-10', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('d5f0c35a-e19f-42b9-86aa-c9b35cace994', 'Kampung NO. 23, JALAN HARMONI 3, TAMAN HARMONI, BENUT', '10000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('c9a21955-998e-46b7-8ca2-2179d48c6227', 'Kampung NO. 9, KG. PT KAHAR JELOTONG, 81000 AYER BALOI PONTIAN', '10000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('18ce17d6-441a-4474-871d-696e92c0d398', 'Kampung NO. 46, JALAN EMAS 1, TAMAN LAGENDA IMPIAN, 81500 PEKAN NANAS', '10000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('635a6bd8-a118-4a4c-8f36-79b24f433397', 'Kampung NO. 1, TAMAN LAKSAMANA, 82300 PERMAS PONTIAN', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('df8890cd-e336-483f-b8e2-9254ca0bba29', 'Kampung NO. 37, AYER MASIN, 82300 KUKUP PONTIAN', '10000000-0000-0000-0000-000000000009') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_kampung (id, name, mukim_id) VALUES ('9fba6f44-ce09-4c2d-97ac-d5bc7ffe1315', 'Kampung NO. 35, AYER MASIN, 82300 KUKUP PONTIAN', '10000000-0000-0000-0000-000000000007') ON CONFLICT (id) DO NOTHING;

-- ── 3. LEADERS (93 rows) ──────────────────────
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('f20befe8-bc03-4d16-9213-f141a55c0342', 'ENCIK ASMADI BIN BACHOK @ MOHD NAWAI', '771229-01-5629', 'ketua_kampung', 'b13c620c-57e8-4052-a306-f1230da08d23', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('0cd95285-c7ab-427e-bd5f-44102557c425', 'ENCIK KARNAIN BIN JUKRI @ JUFRI', '790206-01-5793', 'ketua_kampung', 'ede0e6c6-0de8-4808-abd8-31e1615a0bf6', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('7bfc2098-95ac-41e2-b1d0-7cae77e144e3', 'ENCIK MUHAMAD ROSLI BIN YUSOFF', '691012-01-5521', 'ketua_kampung', 'efef2dac-f3a0-40f0-be63-11d7174ca862', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('54f21dea-217c-4eb8-848d-ddc95788fbf8', 'ENCIK MUHAMAD DIAH BIN AMBOK ANTAK', '690727-01-6355', 'ketua_kampung', '266fceb1-b92a-4781-b006-3487a94a1a5d', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('61c25105-6da6-4ff2-8c47-a0c697f093c9', 'ENCIK HAMID BIN AMIN @ ABD LATIP', '720214-01-6063', 'ketua_kampung', '6d0c862f-1148-4817-8dc8-9601783832c4', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('2138f4fe-e0c3-4b4d-879b-eff046d18b07', 'ENCIK MOHD IKHSAN BIN HASHIM', '630905-01-5677', 'ketua_kampung', 'f6f23132-f970-454e-8b75-42a1fad0afc8', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('3eacad2c-a255-4a45-8e3e-014bc87d53b7', 'ENCIK ZAKARIA BIN OMAR', '700828-01-5235', 'ketua_kampung', 'e889d907-293b-4873-afb6-adb89cbede56', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('9ac584de-f7d2-4703-8bad-939a542cea17', 'ENCIK SAMSUDIN BIN RAPIE', '691227-01-6417', 'ketua_kampung', '333b37ba-294a-4fed-bc06-ae43763d3c57', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('f8f76a9b-b2f4-4807-8a8f-95ca15f532e3', 'ENCIK HAVARI @ MD. AZRI BIN SA''ADON', '721129-01-5335', 'ketua_kampung', '0cf7ef90-b9e1-46cf-a60f-1cffccd2f2b3', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('f29b6bcd-e002-4f6f-ad2f-3cdb6bdeee4a', 'ENCIK MAHNI BIN JAIS', '740531-01-6065', 'ketua_kampung', '5ce21154-ef31-49f2-ba27-c240a847dca9', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('8252904f-d0b8-4811-b0ce-43b250179349', 'ENCIK AHMAD YAHYA BIN DAMIRAN', '620408-01-5175', 'ketua_kampung', 'b92a286b-4ea0-4f23-a03c-115554d0fd9a', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('177dc3fb-2a5f-423b-9d16-a9c5b8be77e3', 'ENCIK MOHAMAD YAHYA BIN SULAIMAN', '740728-01-6181', 'ketua_kampung', '6cfb6ea9-7eff-44fe-aa5f-b8545a42480c', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('da412a3c-fc03-47c1-a7db-2040a8e9f3a7', 'ENCIK YAHYA BIN JAMIL', '610220-01-5545', 'ketua_kampung', '8c2c291e-a45c-415e-b1da-e260b6663fd5', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('0b2ad021-3b8d-410a-85b5-8e61a17d1fc9', 'ENCIK FAUZI BIN BUANG @ MOHD NASRI', '760518-01-6931', 'ketua_kampung', '2f346ce4-7d56-4892-a309-f4a37830da45', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('a15a13d4-ee83-4efc-a2d5-daa708224d20', 'ENCIK JUMARI BIN SALIMIN', '691224-01-5259', 'ketua_kampung', 'f949c86b-4965-470a-b943-ccd9998fd915', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('a4cb29d4-6456-46a1-8ed7-513ba93c82ac', 'ENCIK MOHAMAD SURAHMAN BIN LISIWO', '600817-01-5821', 'ketua_kampung', '1bf0770f-fdbd-4230-872a-f7c7fe96277c', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('bc7b7bee-153b-480f-b542-fd149c8d7a1e', 'ENCIK MOHD KASMADI BIN MD SUBOH', '640226-01-5543', 'ketua_kampung', 'b1df61f6-f74a-4b4a-a78c-57fb094a53d8', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('87f995f8-c7cb-424e-9e51-cb9a4471d192', 'TUAN HAJI ABD RAHIM BIN HAJI LABERAHIMAH', '590101-01-5117', 'ketua_kampung', '6bae8d03-e6b2-4b39-8458-8881bd554c21', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('56203fa5-b45a-4617-b9dc-74b5e3fbb373', 'ENCIK MOHD AMIN BIN AMIL', '701112-01-5373', 'ketua_kampung', 'b8fe716f-80b1-48f1-9329-80fd2474d256', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('c304d739-9bf9-4ae8-979b-6281befb32d5', 'ENCIK MD. KHAMISAN BIN BOHARI', '760923-01-7671', 'ketua_kampung', '66870dcd-f861-45cd-b219-35c6861e2f22', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('58b7950d-23d5-4b39-9689-94a2c76942ee', 'ENCIK SUHAINI BIN MARSOM', '611213-01-5269', 'ketua_kampung', 'f660d9d3-ca2f-4461-bdc1-0bd12aaa2160', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('054ca86b-ba43-443a-b3d6-363581662464', 'ENCIK ZULKEFLEE BIN SAIERI', '641119-01-5745', 'ketua_kampung', 'a219298c-5267-4c1f-8c32-9ab87715f64c', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('cf1e0559-7b64-45bd-bd07-6fb52326e571', 'ENCIK ISMAIL BIN AHMAD', '630110-01-5809', 'ketua_kampung', '4d719de9-6bd5-4c34-ad9d-cfe40395f383', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('0d20df92-0797-4514-9308-ab94dea819e3', 'ENCIK MUSLIM BIN JUPRI', '720127-01-5521', 'ketua_kampung', 'ef208f4a-fdf1-4f47-903f-7de68bc45a65', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('ff5e001e-a42f-4222-a334-882cb0fc6813', 'ENCIK ROSLAN BIN MOHD ALI', '581214-01-5485', 'ketua_kampung', 'e436b133-4f10-41be-82a8-4853d6095aaa', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('87125dca-b0c6-4374-921d-e1f09d454164', 'ENCIK ZAIMIRUDDIN BIN MUSA', '740608-01-6857', 'ketua_kampung', '7c174437-2850-4feb-8256-efa1c4a6ff90', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('857dbca0-96c5-48d2-8c7c-97c9dc70bfcb', 'ENCIK MOHAMMAD NAZIM BIN SURATMAN', '791123-01-5733', 'ketua_kampung', '02673143-e762-45dd-9337-a1b204fb1616', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('d6493b7a-e4f3-4f4c-9aa2-9ccef19913d2', 'ENCIK MOHD ARIFFIN BIN MOHD YUSOF', '790614-01-5987', 'ketua_kampung', '36dc9b2c-ac6c-4c5c-aa71-0b430a4ba16f', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('7378dabb-f3f2-4451-9284-d73c76aec4cc', 'ENCIK KAMAL IBRAHIM BIN WARDI', '670925-01-6825', 'ketua_kampung', 'f2c64589-0afc-49d6-8bb3-ae6ebd0efb3a', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('b918b136-e9b3-4280-9737-51083cd035c5', 'ENCIK MOHD MISWAN BIN SAMAN', '600709-01-5955', 'ketua_kampung', '15f6d112-730b-4875-8b34-694442e83dcc', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('89d5b331-182c-4599-9e5e-a7c484184beb', 'ENCIK MOHAMAD SHAHRIZAN BIN TOMIJAN', '860914-23-5691', 'ketua_kampung', '788d77e0-7852-454f-8adf-7e5b47240a75', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('5a2ef427-1203-4127-b693-dabec9df526f', 'ENCIK HISHAM BIN SALANDRAK', '800121-01-5125', 'ketua_kampung', '31f65ae5-e270-42a6-8230-1d145663605d', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('c4cb2f1c-e523-4eaa-8ec0-236afee272c3', 'ENCIK SA''AD BIN HARON', '551223-01-5981', 'ketua_kampung', '0d4f2dec-f2c4-4eaf-847f-c244b9c2488e', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('50d26ec0-204f-4b19-9ac3-31a559c1a9b2', 'ENCIK MOHD. RASHID BIN MASTAM', '670320-01-5221', 'ketua_kampung', 'e9d47cc4-bebc-41e2-ae13-56a95c53be45', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('277f1b2f-ac67-4184-a86a-1b30c39ad267', 'ENCIK FALAH BIN ABDUL HUSSAIN', '821024-01-6145', 'ketua_kampung', '0088cf10-8a66-40a6-8367-2697b2eca1cb', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('20fc70b0-e20f-4482-ad1b-ef86d571727d', 'ENCIK BORHAM BIN MUSIRON', '601123-01-5805', 'ketua_kampung', 'd1798846-ccf0-4d71-80d0-5d07cbd460be', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('5cd7de76-bf00-453f-a926-de9bb7696d49', 'ENCIK AMSHAH BIN JOHARI', '720129-13-5455', 'ketua_kampung', '92dee776-a29b-461d-ad67-c32f0931d4ad', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('c6b2e5af-1e30-4d1d-a5e2-0998b10667b1', 'TUAN HAJI AZMAN BIN HJ KAMAR', '630328-01-6169', 'ketua_kampung', '2b4d3f32-c042-468a-ac9a-34c9eb9646f1', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('a46a3da9-9393-49ca-9451-7defdd2d4cdc', 'ENCIK JAMRI BIN MARDAN', '670118-01-5957', 'ketua_kampung', '533726ce-d226-4903-aa20-564210077c0f', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('70649a25-042c-4f04-9162-8036e0535e34', 'TUAN HAJI ZAKARIA BIN SANUSI', '591101-01-6149', 'ketua_kampung', 'e68e4c36-a9ff-40b6-86d5-0f1c365b4c73', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('2c359ccb-cfa9-4cb2-95bc-3a0fa9d57786', 'ENCIK KAMIDEN BIN HAJI A. SALAM', '541105-01-5455', 'ketua_kampung', '9217fdae-1589-4df9-9359-a011c86b2cb2', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('a8a18fb3-0edd-4d8b-9395-25748f9dab77', 'ENCIK AB. RAHMAN BIN MOHYIN', '570516-01-6949', 'ketua_kampung', 'b0d98d30-7497-4d86-a244-ddb25ea0c173', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('9832a5a2-272e-470e-b280-9ba922004d84', 'TUAN HAJI ZAINI BIN SA''AT', '590727-01-5397', 'ketua_kampung', 'ce9a1243-8f16-4f62-9530-0bed76b18874', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('4f319b27-caa4-4603-82c7-5649e55a0dec', 'TUAN HAJI HISHAMUDDIN BIN HAJI AJIB', '640501-01-6533', 'ketua_kampung', '3d36c55c-be8b-4b69-b4bc-8f8417a08563', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('ac2cddb3-1efe-4ef7-a122-9febca21fc6f', 'ENCIK MOHD SARLAN BIN SARINGA''AT', '621127-01-5771', 'ketua_kampung', 'bf176dd0-a3e3-4d03-8bf7-9222f00f1864', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('f8fdd7e3-847a-488a-895d-f87022f37aea', 'ENCIK MD ISA BIN KASMIRAN', '651001-10-7723', 'ketua_kampung', 'd1b71e15-d231-452c-a372-5e210fc8961b', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('0c66410f-eff1-49d1-ab92-8979d7224ca5', 'ENCIK M ZAKARIA BIN MISNAN', '720731-01-6133', 'ketua_kampung', '02bb6e71-c9a7-4109-b9b6-0de1acaacc4d', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('970ac256-6e5a-4426-8f8d-a8bf655cbca3', 'ENCIK ALIAS BIN JAFFAR', '660510-01-5987', 'ketua_kampung', '29bd97f4-7b0d-4fc0-9661-1b0be6724495', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('4dec7aed-4e0f-4169-b4be-395de6d07076', 'ENCIK AHMAD SHAH BIN SARTANI', '660102-01-6403', 'ketua_kampung', '066e5b8b-444e-4677-8536-1000df1a8215', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('c94fad20-f119-4e75-a339-e4a90e742ffb', 'TUAN HAJI BAHARUDIN BIN BAHRI', '540410-01-5529', 'ketua_kampung', 'ac847045-a49b-4811-ac5c-3c66cc6a5a5e', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('48ce050d-76a7-4f1b-9afd-75e8ce205bb4', 'ENCIK MD. KARIB BIN ISNIN', '690102-01-7059', 'ketua_kampung', 'e9566e97-ab76-4c69-af3a-6c705e941c68', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('8b535dac-32b4-4652-a74c-6f8e7485ac3e', 'ENCIK RIZAL BIN MOHD ALI', '640731-01-5413', 'ketua_kampung', '6fa46c60-21e5-4bd5-b19b-675fe5cccb20', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('22ddf412-9f44-4cfb-88f2-f2480d220ab5', 'ENCIK ABD RAHMAN BIN ASPAH', '620706-01-5819', 'ketua_kampung', 'd7135d40-997f-44df-8de2-23a69c6c1df9', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('ba14ef26-d68c-4ea9-8d12-4a9be27cb8fe', 'ENCIK MAREZEAN BIN TAHIRIN', '651003-01-5515', 'ketua_kampung', '60938ba5-7aad-463a-b25e-a6485bdc7391', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('ec7b3ec9-a6af-4143-a2aa-7439a69885eb', 'ENCIK MOHD ISA BIN KASNIN', '691027-01-6199', 'ketua_kampung', '0975d168-9bee-4493-afbd-d960b2107a05', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('ce3d6dc9-2d8f-4d37-afbb-ee62e80db919', 'ENCIK AMRAN BIN ABD JALIL', '690401-01-6435', 'ketua_kampung', 'f4249977-64f8-46fa-9a20-a894876a0926', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('db5e1f78-b483-4ef4-8231-a55b83c08d7b', 'ENCIK MOHD ZAINI BIN SARIMIN', '761227-01-6215', 'ketua_kampung', 'd1370bf0-a30e-4556-b66a-7dd15f21413b', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('333897ef-8469-4c2c-91a8-547124efa594', 'ENCIK MOHD KUSHARI BIN MAT SAAD', '800703-01-6101', 'ketua_kampung', '27c46a07-55d8-4905-ad34-070e486b847b', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('f6fafd77-9a13-41e9-820b-15fef1a37cb3', 'ENCIK REJAB BIN TASRIP', '570201-01-6637', 'ketua_kampung', '218087d8-9260-4405-bd2b-bf268aae0526', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('271fc6be-24d5-4e08-93cf-61c6c19991fe', 'ENCIK RAHMAT BIN SIDON', '560708-01-6231', 'ketua_kampung', 'edc1d727-a31d-4345-a67f-62be4e4c4e5b', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('896902f2-fc9d-4f54-ba3c-bc9f688dbb8d', 'ENCIK MOHAMAD HALIF BIN KAMARUDDIN', '890801-01-6131', 'ketua_kampung', '5263d810-919b-4072-b1a6-018198ece5b9', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('6547d968-e543-47b7-a071-3a401e5e03da', 'ENCIK MOHD JAHIDIN BIN PARMAN', '651015-01-6013', 'ketua_kampung', '2ba648bc-547f-40ad-8431-9b101e23297b', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('c0ccc973-f6eb-493e-8aaa-bb074ae3f633', 'ENCIK MOHD ARFZAN BIN ABDUL RAHIM', '591226-02-5575', 'ketua_kampung', 'fda807ad-26d5-4ba4-8cbd-e04cad725076', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('420b4cf1-25a1-408a-bb93-cf7c84c4be6d', 'ENCIK MAHMOOD BIN DASUKI', '011-56601103', 'ketua_kampung', '17eb04b8-13a6-4274-8a37-a45e379bef7a', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('2c65f034-ec0a-4472-960c-a902a3b0f4b5', 'ENCIK MOHD ASRI BIN ALI', '710718-01-5081', 'ketua_kampung', '7702a67d-6885-4d42-abb3-10a0ee9f079c', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('3f1f91df-baaf-4b37-bf04-c40e70fbf4c1', 'ENCIK MOHD DAUD BIN ISMAIL', '700831-01-5017', 'ketua_kampung', '20fc5f73-a141-4c2a-aad4-e68a57d7c059', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('1a83b87d-25ca-4700-9249-07a7ae9bd65f', 'ENCIK MUHAMMAD FAIZ BIN AHMAD RIDZUAN', '770902-01-5617', 'ketua_kampung', 'c91c565a-bf18-4299-9dc9-dd9f632e1f31', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('6b218715-c78a-469a-88c4-2c316c6bdd79', 'ENCIK MALEK BIN LAWNEK', '580725-01-5861', 'ketua_kampung', '2835110c-9fb3-488b-b24a-09001f895b66', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('5e98fd84-9eaf-4798-94d4-fdd08582b778', 'ENCIK ABDULLAH BIN MOHD SAID', '630321-01-5059', 'ketua_kampung', '39b21dd9-1b74-43c3-be1f-0f8dd0d58013', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('d075b7f0-7c3d-4827-b31c-135869109307', 'ENCIK AHMAD AZHRI BIN JA''AFAR', '691104-01-5553', 'ketua_kampung', '09140c01-f53d-462b-a871-555c19e60cf0', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('74964b52-dc34-48e1-b466-221ef890a4ff', 'ENCIK AZIZAN BIN HAJI ALIASAK', '670109-06-5143', 'ketua_kampung', '6fd3c9e9-214b-43e0-a60e-66d1eae760bc', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('18890d7f-5147-455d-bfbf-03a703ece22c', 'ENCIK ZORKARNAIN BIN JALI', '561001-01-5643', 'ketua_kampung', '46e3e073-576e-43f9-a664-3988126479d4', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('82335b82-d29b-4989-ab54-d42806171561', 'ENCIK AHMAD SHUIB BIN HASNUDIN', '861214-23-6639', 'ketua_kampung', '681835b9-76d0-412c-a53d-73e9d7a8a4ae', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('f03002eb-4ff6-447e-add1-96cb93a361ac', 'ENCIK MOHD RUSLY BIN ABAS', '740412-01-6097', 'ketua_kampung', 'f593c677-ee6c-4fa0-b8af-189ca9e5b028', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('0bc4bed2-a4bd-4e82-9dbc-ed71d6f72eed', 'ENCIK MOHD TAHIR BIN ABD HAMID', '640523-01-5187', 'ketua_kampung', '836ce29a-caad-41f1-b0fb-130389dc3482', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('b12b5667-abff-40de-99dc-93c04f36c4c7', 'ENCIK ASBULLAH BIN ADAM', '680611-01-6231', 'ketua_kampung', 'b13a6408-c5e6-438d-9557-dec589a73e34', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('44ca2a66-1323-40e4-93ad-83d2df7906e3', 'ENCIK ABD. RAZAK BIN AB. RAHMAN', '671005-01-6317', 'ketua_kampung', '639e059b-df6d-4a71-86b0-ef1ffe5ea134', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('b7b73653-06dc-4121-a2ed-cd18e5731ddd', 'ENCIK ZAKARIA BIN MUHAMAD', '700710-01-5651', 'ketua_kampung', '84beee41-11e5-474a-b737-3eef33254b95', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('82f4ce4b-b30a-4255-93f4-3842ab711ce8', 'ENCIK MOHD SAFUAN BIN SAHIMI', '941112-01-5851', 'ketua_kampung', '403dce65-0a23-4e89-93ca-8f6c5e102efa', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('985d8900-7c54-45b7-8ce9-d2c624ee3088', 'ENCIK NORDIN BIN ADAM', '670610-01-6193', 'ketua_kampung', '60e43994-e39a-4f5a-8d18-5348200d5433', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('24e6285e-eb19-49a4-8397-237f4211f537', 'ENCIK TAIB BIN ABDUL RAHIM', '801103-01-5417', 'ketua_kampung', '0c1633cb-acec-4f4a-8a4e-97c5ab4b9648', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('ad1cb62f-1d74-4026-864e-bc19b31cff89', 'ENCIK KASBON BIN KASRON', '720410-01-5965', 'ketua_kampung', '5d538979-c6bd-48f3-b0ac-2bcb34e0b9c5', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('98135013-5adf-4575-bb8e-fff1716bc548', 'ENCIK GHAZALI BIN ABD RAZAK', '551118-01-5613', 'ketua_kampung', 'a48c20a3-e4dd-42b6-a6ab-5b22f2569902', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('d9324548-1d47-485c-bcb6-362f628649b8', 'ENCIK AHMAD ZAINAL HURI BIN OMAR', '670701-08-6613', 'ketua_kampung', '8406294b-f60a-4e09-b885-6ce7c7ecdd5f', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('35669693-c105-4a13-838a-6e5dac4f685f', 'ENCIK HAMIDON BIN RIFFIN', '621017-01-5447', 'ketua_kampung', 'eb3f39cb-7b05-4d49-bfa6-50346312006b', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('eb5b8373-e836-418a-909e-f0b9933dc93b', 'ENCIK MOHD ZAMRI BIN A MOIN', '731102-01-6337', 'ketua_kampung', '791aa69f-eb0c-4bf3-b1db-7418c39b91f2', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('d6b68f6d-2acb-49b1-ad21-27c66865fe27', 'ENCIK FIRDAUS BIN MOHD RAMLI', '820224-71-5069', 'ketua_kampung', '8879a62c-e5c6-41e8-902b-8c5b232f5bd1', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('3e1a7d59-5172-479e-b4d0-54b77345565f', 'ENCIK LOH ENG HOCK', '681013-01-5161', 'ketua_kampung', 'd5f0c35a-e19f-42b9-86aa-c9b35cace994', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('59c65ee4-9eed-468f-a59b-1413e328bf1b', 'ENCIK LOH CHOR PIAH', '660910-01-6081', 'ketua_kampung', 'c9a21955-998e-46b7-8ca2-2179d48c6227', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('672f0a24-edee-4197-84ba-c4679efd20f2', 'ENCIK NG KIN LAI', '790329-01-5689', 'ketua_kampung', '18ce17d6-441a-4474-871d-696e92c0d398', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('0a9e60a5-0772-4f68-bedd-36577b64cadc', 'ENCIK TAN SAY BOON', '660730-01-5399', 'ketua_kampung', '635a6bd8-a118-4a4c-8f36-79b24f433397', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('368673c8-6370-4de5-9d0c-daf35477e188', 'ENCIK LOH SOH EN', '710501-01-5400', 'ketua_kampung', 'df8890cd-e336-483f-b8e2-9254ca0bba29', '2025-06-01') ON CONFLICT (id) DO NOTHING;
INSERT INTO aclis_leader (id, name, ic_no, type, kampung_id, tarikh_lantikan) VALUES ('a755576e-06f8-458b-8a53-4a869fe2b948', 'TUAN LIM HONG PENG', '871121-01-5289', 'ketua_kampung', '9fba6f44-ce09-4c2d-97ac-d5bc7ffe1315', '2025-06-01') ON CONFLICT (id) DO NOTHING;

-- ── 4. TEST LOGIN (admin@aclis.test / Test1234!) ──────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@aclis.test',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"admin_daerah"}',
  '{}', now(), now(), 'authenticated', 'authenticated',
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-000000000001","email":"admin@aclis.test"}',
  'email', 'admin@aclis.test', now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO aclis_app_user (id, role, email, leader_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'admin_daerah', 'admin@aclis.test', NULL)
ON CONFLICT (id) DO NOTHING;

-- ── 5. TEST LOGIN (penghulu@aclis.test / Test1234!) ──────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'penghulu@aclis.test',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"penghulu"}',
  '{}', now(), now(), 'authenticated', 'authenticated',
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
  'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-000000000002","email":"penghulu@aclis.test"}',
  'email', 'penghulu@aclis.test', now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO aclis_app_user (id, role, email, leader_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', 'penghulu', 'penghulu@aclis.test', NULL)
ON CONFLICT (id) DO NOTHING;

-- ── 6. TEST LOGIN (ketua@aclis.test / Test1234!) ──────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'cccccccc-cccc-cccc-cccc-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'ketua@aclis.test',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"ketua_kampung"}',
  '{}', now(), now(), 'authenticated', 'authenticated',
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
VALUES (
  'cccccccc-cccc-cccc-cccc-000000000003',
  'cccccccc-cccc-cccc-cccc-000000000003',
  '{"sub":"cccccccc-cccc-cccc-cccc-000000000003","email":"ketua@aclis.test"}',
  'email', 'ketua@aclis.test', now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO aclis_app_user (id, role, email, leader_id)
VALUES (
  'cccccccc-cccc-cccc-cccc-000000000003',
  'ketua_kampung',
  'ketua@aclis.test',
  (SELECT id FROM aclis_leader WHERE type = 'ketua_kampung' LIMIT 1)
) ON CONFLICT (id) DO NOTHING;