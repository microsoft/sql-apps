param name string
param location string
param networkId string
param targetId string
param groupId string
param dnsZone string

resource zone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: dnsZone
  location: 'global'
}
resource link 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: zone
  name: name
  location: 'global'
  properties: { registrationEnabled: false, virtualNetwork: { id: networkId } }
}
resource endpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: name
  location: location
  properties: {
    subnet: { id: '${networkId}/subnets/endpoints' }
    privateLinkServiceConnections: [{
      name: name
      properties: { privateLinkServiceId: targetId, groupIds: [groupId] }
    }]
  }
}
resource dns 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = {
  parent: endpoint
  name: 'default'
  properties: { privateDnsZoneConfigs: [{ name: 'default', properties: { privateDnsZoneId: zone.id } }] }
}
