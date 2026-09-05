# Specs dos personagens para o Blender (espelham src/visual/CharacterFactory.js).
# `teamShirt`: a camisa vira material TEAM (militante/fiel); os outros usam a braçadeira TEAM_band.
# `jurassic`: gera as peças JUR_ (cauda, crista, dentes) ocultas para o MODO JURÁSSICO.
# `heavy`: passos mais lentos/baixos nos clipes.
SPECS = {
    'militante': dict(id='militante', headScale=1.05, bodyType='small', skin=0xf1c27d, shirt=0x2bb3c0, teamShirt=True, pants=0x2f3542, hair='cap', hairColor=0x2b1d14, weapon='sign', mouth='shout', eyeStyle='angry'),
    'fiel':      dict(id='fiel', headScale=1.0, bodyType='small', skin=0xc68642, shirt=0xf4f4f4, pants=0x555555, hair='short', hairColor=0x111111, weapon='sign', mouth='shout', eyeStyle='sleepy', teamBand=False),
    'tiozap':    dict(id='tiozap', headScale=1.1, bodyType='belly', skin=0xe8b98a, shirt=0x2e8b57, pants=0x8b7355, hair='bald', hairColor=0x777777, glasses=True, weapon='phone', mouth='flat'),
    'assessor':  dict(id='assessor', headScale=1.0, bodyType='normal', skin=0xf1c27d, shirt=0x2b2b3a, pants=0x2b2b3a, shoes=0x111111, hair='side', hairColor=0x1a1a1a, suit=True, tie=0xc0392b, weapon='papers', accessory='briefcase', mouth='flat', eyeStyle='sleepy'),
    'influencer':dict(id='influencer', headScale=1.05, bodyType='small', skin=0xffdbac, shirt=0xff4d8d, pants=0xffffff, shoes=0xffffff, hair='side', hairColor=0xf7e26b, sunglasses=True, weapon='phone', accessory='ringlight', mouth='smile'),
    'barbudo':   dict(id='barbudo', headScale=1.3, bodyType='belly', skin=0xd9a066, shirt=0xf5f5f5, pants=0x2f3542, shoes=0x111111, hair='short', hairColor=0xbdbdbd, beard=True, suit=True, tie=0x8e2b2b, weapon='mic', mouth='shout'),
    'capitao':   dict(id='capitao', headScale=1.2, bodyType='normal', skin=0xf1c27d, shirt=0x1c2a44, pants=0x1c2a44, shoes=0x111111, hair='side', hairColor=0x3a3a3a, suit=True, tie=0x2f8f4e, mouth='shout', eyeStyle='angry'),
    'careca':    dict(id='careca', headScale=1.45, bodyType='normal', skin=0xf1c27d, shirt=0x111111, pants=0x111111, shoes=0x111111, hair='bald', hairColor=0x222222, cape=0x111111, glasses=True, weapon='pen', mouth='flat', eyeStyle='angry', heavy=True),
    'dino':      dict(id='dino', headScale=1.35, bodyType='big', skin=0xf1c27d, shirt=0x2c3e50, pants=0x2c3e50, shoes=0x111111, hair='short', hairColor=0x111111, beard=True, suit=True, tie=0x3d6db5, mouth='smile', jurassic=True, heavy=True),
    'agroboy':   dict(id='agroboy', headScale=1.1, bodyType='normal', skin=0xd9a066, shirt=0xc94a2a, pants=0x2f4a8a, shoes=0x5a3a1e, hair='short', hairColor=0x3a2412, beard=True, weapon='laco', accessory='hat', hatColor=0x8b5a2b, mouth='flat', eyeStyle='angry'),
    'coach':     dict(id='coach', headScale=1.05, bodyType='big', skin=0xe8b98a, shirt=0x2e8b57, pants=0x1c1c1c, shoes=0xffffff, hair='bald', hairColor=0x222222, sunglasses=True, weapon='megaphone', accessory='headband', bandColor=0xf5b400, mouth='shout'),
    'pastor':    dict(id='pastor', headScale=1.15, bodyType='belly', skin=0xf1c27d, shirt=0x2b2b3a, pants=0x2b2b3a, shoes=0x111111, hair='side', hairColor=0x4a4a4a, suit=True, tie=0x6b2a8f, glasses=True, weapon='book', bookColor=0x3b2a6b, mouth='shout'),
    'pneus':     dict(id='pneus', headScale=1.05, bodyType='normal', skin=0xc68642, shirt=0x3a6b35, pants=0x2f3542, shoes=0x111111, hair='cap', hairColor=0x111111, weapon='tire', mouth='shout', eyeStyle='angry'),
    'maconheiro':dict(id='maconheiro', headScale=1.1, bodyType='small', skin=0xf1c27d, shirt=0x5b8f3a, pants=0x8b7355, shoes=0x333333, hair='side', hairColor=0x2b1d14, beard=True, mouth='smile', eyeStyle='sleepy'),
    'musico':    dict(id='musico', headScale=1.05, bodyType='normal', skin=0xd9a066, shirt=0x8b1e3f, pants=0x1c1c1c, shoes=0x111111, hair='side', hairColor=0x111111, sunglasses=True, weapon='guitar', mouth='smile'),
    'mascote':   dict(id='mascote', headScale=1.5, bodyType='big', skin=0xffd23f, shirt=0xffd23f, pants=0x2e8b57, shoes=0xffffff, hair='cap', hairColor=0xffd23f, accessory='whistle', mouth='smile', heavy=True),
}
